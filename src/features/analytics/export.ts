import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  AiStats, AnalyticsSummary, CostTrend, GarageCost, IssueFreq, VehicleKpi,
} from '../../lib/api/analyticsApi';

export interface MasterReportData {
  summary: AnalyticsSummary | null;
  trends: CostTrend[];
  reportRows: CostTrend[];
  vehicles: VehicleKpi[];
  garageCosts: GarageCost[];
  issueFreq: IssueFreq[];
  aiStats: AiStats | null;
  /** Spec 0012, AC-13: the AI section is left out while AI is off. */
  aiOn: boolean;
  /** Spec 0013, AC-6: without ticket.costs.view every money column is left out. */
  costsHidden: boolean;
}

// jsPDF needs RGB triples: brand navy, white, and the light row stripe
const PDF_NAVY: [number, number, number] = [30, 27, 75];
const PDF_WHITE: [number, number, number] = [255, 255, 255];
const PDF_STRIPE: [number, number, number] = [248, 250, 252];

// jspdf-autotable writes this onto the doc after each table
type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

function riskLabel(repairs: number) {
  return repairs >= 10 ? 'HIGH' : repairs >= 5 ? 'MEDIUM' : 'LOW';
}

/** A money value for a file; only read when costs are shown, so null never reaches it. */
function amount(n: number | null) {
  return n ?? 0;
}

function peso(n: number | null) {
  return `PHP ${Math.round(amount(n)).toLocaleString()}`;
}

function csvCell(value: string | number) {
  return typeof value === 'number' ? String(value) : `"${value.replace(/"/g, '""')}"`;
}

// Always exports every month, whatever rows are selected in the table
export function downloadMasterCsv({ summary, trends, reportRows, vehicles, garageCosts, issueFreq, aiStats, aiOn, costsHidden }: MasterReportData) {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  const row = (...cells: (string | number)[]) => lines.push(cells.map(csvCell).join(','));

  lines.push('WELINC LOGISTICS INC. — ENTERPRISE MASTER FLEET ANALYTICS REPORT');
  lines.push(`Generated Date,${today}`);
  if (costsHidden) lines.push('Costs are hidden for your role');
  lines.push('');

  lines.push('--- 1. EXECUTIVE FLEET SUMMARY ---');
  if (!costsHidden) lines.push(`Total Fleet Spend (PHP),${amount(summary?.total_spend ?? null)}`);
  lines.push(`Total Repair Tickets,${summary?.total_repairs ?? 0}`);
  if (!costsHidden) lines.push(`Average Cost Per Repair (PHP),${amount(summary?.avg_cost_per_repair ?? null)}`);
  lines.push(`Active Fleet Vehicles,${summary?.total_vehicles ?? 0}`);
  lines.push('');

  lines.push('--- 2. MONTHLY REPAIR COST TRENDS ---');
  const totalSpendAll = trends.reduce((a, b) => a + amount(b.total_spend), 0);
  if (costsHidden) {
    lines.push('Month,Repair Tickets');
    reportRows.forEach(r => row(r.month, r.repair_count));
  } else {
    lines.push('Month,Period,Repair Tickets,Total Spend (PHP),Avg Cost Per Repair (PHP),Cumulative Spend (PHP),Share of Total (%),Operational Status');
    reportRows.forEach(r => {
      const spend = amount(r.total_spend);
      const avgCost = r.repair_count > 0 ? (spend / r.repair_count).toFixed(2) : '0.00';
      const sharePct = totalSpendAll > 0 ? ((spend / totalSpendAll) * 100).toFixed(1) + '%' : '0.0%';
      const status = (r.repair_count > 0 && Number(avgCost) > 3000) ? 'ELEVATED SPEND' : r.repair_count > 0 ? 'OPTIMAL' : 'NO ACTIVITY';
      row(r.month, r.month, r.repair_count, spend.toFixed(2), avgCost, amount(r.cumulative_spend).toFixed(2), sharePct, status);
    });
  }
  lines.push('');

  lines.push('--- 3. VEHICLE RELIABILITY & MAINTENANCE RISK SCORECARD ---');
  lines.push(costsHidden
    ? 'Plate Number,Vehicle Model,Total Repairs,Risk Level'
    : 'Plate Number,Vehicle Model,Total Repairs,Total Parts Cost (PHP),Avg Repair Cost (PHP),Risk Level');
  vehicles.forEach(v => {
    if (costsHidden) row(v.vehicle_plate, v.vehicle_model, v.total_repairs, riskLabel(v.total_repairs));
    else row(v.vehicle_plate, v.vehicle_model, v.total_repairs, amount(v.total_parts_cost).toFixed(2), amount(v.avg_repair_cost).toFixed(2), riskLabel(v.total_repairs));
  });
  lines.push('');

  lines.push('--- 4. GARAGE BRANCH COST DISTRIBUTION ---');
  lines.push(costsHidden ? 'Garage Branch,Repair Count' : 'Garage Branch,Repair Count,Total Spend (PHP)');
  garageCosts.forEach(g => {
    if (costsHidden) row(g.garage, g.repair_count);
    else row(g.garage, g.repair_count, amount(g.total_spend).toFixed(2));
  });
  lines.push('');

  lines.push('--- 5. TOP RECURRING FLEET REPAIR ISSUES ---');
  lines.push('Issue Description,Occurrence Count');
  issueFreq.forEach(f => row(f.description, f.occurrence_count));
  lines.push('');

  if (aiOn && aiStats) {
    lines.push('--- 6. AI DIAGNOSES AND RATINGS ---');
    lines.push(`Total AI Diagnoses,${aiStats.total_interactions}`);
    lines.push(`Ratings Received,${aiStats.satisfaction.total_feedback}`);
    lines.push(`Satisfaction Rate (%),${aiStats.satisfaction.satisfaction_rate}%`);
    lines.push(`Average Rating,${aiStats.satisfaction.avg_rating} / 5.0`);
  }

  // BOM so Excel opens the file as UTF-8
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `WeLinc_VRMS_Enterprise_Master_Analytics_${today}.csv`;
  a.click();
}

export function downloadMasterPdf({ summary, trends, reportRows, vehicles, garageCosts, issueFreq, costsHidden }: MasterReportData) {
  const doc = new jsPDF() as DocWithAutoTable;
  const today = new Date().toLocaleDateString('en-US');

  const checkNewPage = (neededSpace: number, currentY: number) => {
    if (currentY + neededSpace > 270) {
      doc.addPage();
      return 20;
    }
    return currentY;
  };

  const sectionTitle = (text: string, y: number) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_NAVY);
    doc.text(text, 14, y);
  };

  const headStyles = { fillColor: PDF_NAVY, textColor: PDF_WHITE, fontStyle: 'bold' as const };

  // Header banner
  doc.setFillColor(...PDF_NAVY);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setFontSize(15);
  doc.setTextColor(...PDF_WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('WELINC LOGISTICS INC.', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ENTERPRISE MASTER FLEET REPAIR & COST ANALYTICS REPORT', 14, 23);
  doc.text(`Date: ${today}`, 165, 23);

  // Executive summary box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, 36, 182, 24, 3, 3, 'F');

  const boxes: [string, string][] = [
    ...(costsHidden ? [] : [['Total Fleet Spend', peso(summary?.total_spend ?? null)] as [string, string]]),
    ['Total Repairs', `${summary?.total_repairs ?? 0}`],
    ...(costsHidden ? [] : [['Avg Cost / Repair', peso(summary?.avg_cost_per_repair ?? null)] as [string, string]]),
    ['Active Vehicles', `${summary?.total_vehicles ?? 0}`],
  ];
  boxes.forEach(([label, value], i) => {
    const x = 20 + i * (180 / boxes.length);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(label, x, 44);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_NAVY);
    doc.text(value, x, 54);
  });

  let y = 68;
  if (costsHidden) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text('Costs are hidden for your role.', 14, y - 2);
    y += 6;
  }

  sectionTitle('1. MONTHLY REPAIRS', y);
  const totalSpendAll = trends.reduce((a, b) => a + amount(b.total_spend), 0);
  autoTable(doc, {
    startY: y + 4,
    head: [costsHidden ? ['Month', 'Repairs'] : ['Month', 'Repairs', 'Total Spend', 'Avg / Repair', 'Cumulative Spend', 'Spend %']],
    body: reportRows.map(row => {
      if (costsHidden) return [row.month, row.repair_count.toString()];
      const spend = amount(row.total_spend);
      const avg = row.repair_count > 0 ? spend / row.repair_count : 0;
      const pct = totalSpendAll > 0 ? ((spend / totalSpendAll) * 100).toFixed(1) + '%' : '0%';
      return [row.month, row.repair_count.toString(), peso(spend), peso(avg), peso(row.cumulative_spend), pct];
    }),
    headStyles,
    alternateRowStyles: { fillColor: PDF_STRIPE },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });
  y = doc.lastAutoTable.finalY + 12;

  y = checkNewPage(45, y);
  sectionTitle('2. GARAGE BRANCHES', y);
  autoTable(doc, {
    startY: y + 4,
    head: [costsHidden ? ['Garage Branch', 'Repair Count'] : ['Garage Branch', 'Repair Count', 'Total Spend']],
    body: garageCosts.map(g => costsHidden
      ? [g.garage, g.repair_count.toString()]
      : [g.garage, g.repair_count.toString(), peso(g.total_spend)]),
    headStyles,
    styles: { fontSize: 8, cellPadding: 2.5 },
  });
  y = doc.lastAutoTable.finalY + 12;

  y = checkNewPage(65, y);
  sectionTitle('3. VEHICLE RELIABILITY & RISK SCORECARD', y);
  autoTable(doc, {
    startY: y + 4,
    head: [costsHidden
      ? ['Vehicle Plate', 'Model', 'Repairs', 'Risk Level']
      : ['Vehicle Plate', 'Model', 'Repairs', 'Total Parts Cost', 'Avg Cost', 'Risk Level']],
    body: vehicles.slice(0, 8).map(v => costsHidden
      ? [v.vehicle_plate, v.vehicle_model, v.total_repairs.toString(), riskLabel(v.total_repairs)]
      : [v.vehicle_plate, v.vehicle_model, v.total_repairs.toString(), peso(v.total_parts_cost), peso(v.avg_repair_cost), riskLabel(v.total_repairs)]),
    headStyles,
    alternateRowStyles: { fillColor: PDF_STRIPE },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
  });
  y = doc.lastAutoTable.finalY + 12;

  y = checkNewPage(50, y);
  sectionTitle('4. TOP RECURRING FLEET REPAIR ISSUES', y);
  autoTable(doc, {
    startY: y + 4,
    head: [['Issue Description', 'Occurrences']],
    body: issueFreq.slice(0, 6).map(f => [f.description, f.occurrence_count.toString()]),
    headStyles,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
  });

  doc.save(`WeLinc_VRMS_Enterprise_Master_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
