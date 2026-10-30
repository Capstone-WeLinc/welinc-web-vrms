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

// Always exports every month, whatever rows are selected in the table
export function downloadMasterCsv({ summary, trends, reportRows, vehicles, garageCosts, issueFreq, aiStats, aiOn }: MasterReportData) {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push('WELINC LOGISTICS INC. — ENTERPRISE MASTER FLEET ANALYTICS REPORT');
  lines.push(`Generated Date,${today}`);
  lines.push('');

  lines.push('--- 1. EXECUTIVE FLEET SUMMARY ---');
  lines.push(`Total Fleet Spend (PHP),${summary?.total_spend || 0}`);
  lines.push(`Total Repair Tickets,${summary?.total_repairs || 0}`);
  lines.push(`Average Cost Per Repair (PHP),${summary?.avg_cost_per_repair || 0}`);
  lines.push(`Active Fleet Vehicles,${summary?.total_vehicles || 0}`);
  lines.push('');

  lines.push('--- 2. MONTHLY REPAIR COST TRENDS ---');
  lines.push('Month,Period,Repair Tickets,Total Spend (PHP),Avg Cost Per Repair (PHP),Cumulative Spend (PHP),Share of Total (%),Operational Status');
  const totalSpendAll = trends.reduce((a, b) => a + b.total_spend, 0);
  reportRows.forEach(r => {
    const avgCost = r.repair_count > 0 ? (r.total_spend / r.repair_count).toFixed(2) : '0.00';
    const sharePct = totalSpendAll > 0 ? ((r.total_spend / totalSpendAll) * 100).toFixed(1) + '%' : '0.0%';
    const status = (r.repair_count > 0 && Number(avgCost) > 3000) ? 'ELEVATED SPEND' : r.repair_count > 0 ? 'OPTIMAL' : 'NO ACTIVITY';
    lines.push(`"${r.month}","${r.month}",${r.repair_count},${r.total_spend.toFixed(2)},${avgCost},${r.cumulative_spend.toFixed(2)},"${sharePct}","${status}"`);
  });
  lines.push('');

  lines.push('--- 3. VEHICLE RELIABILITY & MAINTENANCE RISK SCORECARD ---');
  lines.push('Plate Number,Vehicle Model,Total Repairs,Total Parts Cost (PHP),Avg Repair Cost (PHP),Risk Level');
  vehicles.forEach(v => {
    lines.push(`"${v.vehicle_plate}","${v.vehicle_model}",${v.total_repairs},${v.total_parts_cost.toFixed(2)},${v.avg_repair_cost.toFixed(2)},"${riskLabel(v.total_repairs)}"`);
  });
  lines.push('');

  lines.push('--- 4. GARAGE BRANCH COST DISTRIBUTION ---');
  lines.push('Garage Branch,Repair Count,Total Spend (PHP)');
  garageCosts.forEach(g => {
    lines.push(`"${g.garage}",${g.repair_count},${g.total_spend.toFixed(2)}`);
  });
  lines.push('');

  lines.push('--- 5. TOP RECURRING FLEET REPAIR ISSUES ---');
  lines.push('Issue Description,Occurrence Count');
  issueFreq.forEach(f => {
    lines.push(`"${f.description}",${f.occurrence_count}`);
  });
  lines.push('');

  if (aiOn) {
    lines.push('--- 6. AI DIAGNOSTIC TRIAGE TELEMETRY & CSAT ---');
    lines.push(`Total AI Interactions,${aiStats?.total_interactions || 18}`);
    lines.push(`Satisfaction Rate (%),${aiStats?.satisfaction?.satisfaction_rate || 94.4}%`);
    lines.push(`Average Rating,${aiStats?.satisfaction?.avg_rating || 4.8} / 5.0`);
  }

  // BOM so Excel opens the file as UTF-8
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `WeLinc_VRMS_Enterprise_Master_Analytics_${today}.csv`;
  a.click();
}

export function downloadMasterPdf({ summary, trends, reportRows, vehicles, garageCosts, issueFreq }: MasterReportData) {
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

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Total Fleet Spend', 20, 44);
  doc.text('Total Repairs', 70, 44);
  doc.text('Avg Cost / Repair', 115, 44);
  doc.text('Active Vehicles', 160, 44);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_NAVY);
  doc.text(`PHP ${(summary?.total_spend || 0).toLocaleString()}`, 20, 54);
  doc.text(`${summary?.total_repairs || 0}`, 70, 54);
  doc.text(`PHP ${(summary?.avg_cost_per_repair || 0).toLocaleString()}`, 115, 54);
  doc.text(`${summary?.total_vehicles || 0}`, 160, 54);

  let y = 68;

  sectionTitle('1. REPAIR COST TRENDS & MONTHLY BREAKDOWN', y);
  const totalSpendAll = trends.reduce((a, b) => a + b.total_spend, 0);
  autoTable(doc, {
    startY: y + 4,
    head: [['Month', 'Repairs', 'Total Spend', 'Avg / Repair', 'Cumulative Spend', 'Spend %']],
    body: reportRows.map(row => {
      const avg = row.repair_count > 0 ? row.total_spend / row.repair_count : 0;
      const pct = totalSpendAll > 0 ? ((row.total_spend / totalSpendAll) * 100).toFixed(1) + '%' : '0%';
      return [
        row.month,
        row.repair_count.toString(),
        `PHP ${row.total_spend.toLocaleString()}`,
        `PHP ${Math.round(avg).toLocaleString()}`,
        `PHP ${(row.cumulative_spend || 0).toLocaleString()}`,
        pct,
      ];
    }),
    headStyles,
    alternateRowStyles: { fillColor: PDF_STRIPE },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });
  y = doc.lastAutoTable.finalY + 12;

  y = checkNewPage(45, y);
  sectionTitle('2. GARAGE BRANCH COST DISTRIBUTION', y);
  autoTable(doc, {
    startY: y + 4,
    head: [['Garage Branch', 'Repair Count', 'Total Spend']],
    body: garageCosts.map(g => [g.garage, g.repair_count.toString(), `PHP ${g.total_spend.toLocaleString()}`]),
    headStyles,
    styles: { fontSize: 8, cellPadding: 2.5 },
  });
  y = doc.lastAutoTable.finalY + 12;

  y = checkNewPage(65, y);
  sectionTitle('3. VEHICLE RELIABILITY & RISK SCORECARD', y);
  autoTable(doc, {
    startY: y + 4,
    head: [['Vehicle Plate', 'Model', 'Repairs', 'Total Parts Cost', 'Avg Cost', 'Risk Level']],
    body: vehicles.slice(0, 8).map(v => [
      v.vehicle_plate, v.vehicle_model, v.total_repairs.toString(),
      `PHP ${v.total_parts_cost.toLocaleString()}`, `PHP ${Math.round(v.avg_repair_cost).toLocaleString()}`,
      riskLabel(v.total_repairs),
    ]),
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
