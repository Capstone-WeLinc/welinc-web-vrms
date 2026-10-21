import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Search, Wrench, Plus, Pencil, Trash2,
  X, Clock, Tag, ChevronRight, AlertTriangle, CheckCircle,
  Zap, Shield, Layers, Settings, RefreshCw, Save,
  LayoutGrid, List,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { getKnowledgeArticles } from '../../../lib/api/aiApi';

const STORAGE_KEY = 'welinc_kb_articles';

const CATEGORIES = [
  'All',
  'Engine',
  'Electrical',
  'Brakes',
  'Transmission',
  'Suspension',
  'Cooling',
  'Steering',
  'General',
] as const;

type CategoryType = typeof CATEGORIES[number];

export interface KbArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  steps: string[];
  parts: string[];
  estimated_hours: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORY_STYLES: Record<string, { icon: typeof Wrench; badgeClass: string; iconColor: string }> = {
  Engine: { icon: Settings, badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', iconColor: 'text-amber-600' },
  Electrical: { icon: Zap, badgeClass: 'bg-blue-50 text-brand-primary border-blue-200', iconColor: 'text-brand-primary' },
  Brakes: { icon: Shield, badgeClass: 'bg-red-50 text-red-800 border-red-200', iconColor: 'text-brand-danger' },
  Transmission: { icon: Layers, badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200', iconColor: 'text-indigo-600' },
  Suspension: { icon: Wrench, badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', iconColor: 'text-emerald-600' },
  Cooling: { icon: RefreshCw, badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200', iconColor: 'text-cyan-600' },
  Steering: { icon: Wrench, badgeClass: 'bg-teal-50 text-teal-800 border-teal-200', iconColor: 'text-teal-600' },
  General: { icon: BookOpen, badgeClass: 'bg-slate-100 text-slate-800 border-slate-200', iconColor: 'text-slate-600' },
};

const DEFAULT_ARTICLES: KbArticle[] = [
  {
    id: 'art-001',
    category: 'Electrical',
    title: 'Headlight & Electrical Circuit Troubleshooting SOP',
    summary: 'Standard operating diagnostic guide for inspecting flickering headlights, blown circuit fuses, and automotive relay faults in commercial fleet vehicles.',
    steps: [
      'Check open-circuit battery voltage with a digital multimeter (must be 12.6V or higher).',
      'Inspect passenger cabin and engine bay fuse distribution boxes for blown fuses using a test light.',
      'Test headlight high/low beam relay pinouts (terminals 30, 85, 86, 87) for proper coil resistance and switching continuity.',
      'Inspect wire harnesses along the chassis and firewall for insulation rubbing, ground corrosion, or harness pin degradation.',
      'Measure charging system alternator output under 2,000 RPM engine load (nominal range: 13.8V – 14.5V).'
    ],
    parts: ['Headlight Relay 4-Pin 12V 40A', 'Automotive Blade Fuse Assortment (10A, 15A, 20A)', 'Battery Terminal Anti-Corrosion Washers', 'Electrical Contact Cleaner Spray'],
    estimated_hours: 2.0,
    tags: ['electrical', 'headlight', 'fuse', 'relay', 'battery', 'multimeter'],
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-15T10:30:00Z'
  },
  {
    id: 'art-002',
    category: 'Brakes',
    title: 'Air Brake Compressor & Reservoir Pressure Test SOP',
    summary: 'Standard operating procedure for verifying air brake governor cut-in/cut-out pressures and inspecting pneumatic system leak-down rates.',
    steps: [
      'Chock vehicle wheels on level ground and release spring parking brakes to ensure accurate air circuit reading.',
      'Run engine at fast idle (1,200 RPM) and time pressure buildup from 85 PSI to 100 PSI (must complete within 45 seconds).',
      'Verify compressor governor cut-out threshold (must reliably cut out between 120 PSI and 135 PSI).',
      'Fan service brakes down until governor cuts in (verify cut-in occurs between 100 PSI and 105 PSI).',
      'Shut down engine, apply full service brake pressure, and hold for 2 minutes to verify pneumatic leak rate is less than 3 PSI per minute.'
    ],
    parts: ['Air Governor D-2 Type', 'High-Pressure Pneumatic Test Gauge', 'Air Dryer Desiccant Cartridge', 'Thread Sealant Teflon Paste'],
    estimated_hours: 2.5,
    tags: ['brakes', 'pneumatics', 'air-brake', 'compressor', 'governor', 'pressure-test'],
    createdAt: '2026-09-02T09:00:00Z',
    updatedAt: '2026-09-16T11:00:00Z'
  },
  {
    id: 'art-003',
    category: 'Brakes',
    title: 'Hydraulic Brake Pad & Rotor Inspection SOP',
    summary: 'Standard operating procedure for inspecting friction lining wear, measuring brake rotor runout, and replacing hydraulic brake pads across fleet vehicles.',
    steps: [
      'Hoist vehicle safely, remove road wheels, and measure friction pad friction lining thickness (minimum legal discard: 3.0mm).',
      'Measure brake rotor thickness using an outside micrometer at 4 equidistant points; compare against minimum discard stamping.',
      'Inspect caliper slider pins and rubber dust boots for seized guide pins, tearing, or uneven pad wear tapering.',
      'Check caliper hydraulic piston seals for fluid weeping; test hydraulic line flex hoses for dry rot or ballooning.',
      'Perform brake fluid flush using DOT 4 fluid and bleed air bubbles until pedal feel is firm and positive.'
    ],
    parts: ['Semi-Metallic Front Brake Pad Set', 'Vented Brake Rotors (Pair)', 'Brake Fluid DOT 4 (1 Liter)', 'Silicone Brake Caliper Grease'],
    estimated_hours: 3.0,
    tags: ['brakes', 'rotor', 'pads', 'caliper', 'hydraulic', 'bleeding'],
    createdAt: '2026-09-03T10:00:00Z',
    updatedAt: '2026-09-17T14:20:00Z'
  },
  {
    id: 'art-004',
    category: 'Engine',
    title: 'Diesel Fuel Injection & Rail Pressure Diagnostic Guide',
    summary: 'Comprehensive diagnostic workflow for troubleshooting hard starting, black smoke emissions, and low common rail pressure codes in diesel engines.',
    steps: [
      'Connect diagnostic OBD-II scan tool and record Common Rail Fuel Pressure (FRP) setpoint vs actual rail pressure at idle.',
      'Inspect primary fuel filter and water separator bowl for water contamination, bio-sludge, or sediment restriction.',
      'Perform injector return leak-off volume test using graduated glass vials to identify injectors with worn control valves.',
      'Inspect fuel rail pressure sensor and suction control valve (SCV) harness connectors for contact resistance.',
      'Execute high-pressure pump fuel delivery test and verify fuel supply lift pump priming pressure.'
    ],
    parts: ['Fuel Filter / Water Separator Element', 'Suction Control Valve (SCV)', 'Common Rail Pressure Sensor', 'High-Pressure Fuel Line Seals'],
    estimated_hours: 3.5,
    tags: ['engine', 'diesel', 'fuel-injection', 'rail-pressure', 'scv', 'diagnostics'],
    createdAt: '2026-09-04T11:00:00Z',
    updatedAt: '2026-09-18T16:00:00Z'
  },
  {
    id: 'art-005',
    category: 'Cooling',
    title: 'Radiator Pressure Flush & Thermostat Verification SOP',
    summary: 'Preventive cooling system maintenance procedure for descaling radiators, replacing thermostats, and testing coolant freeze/boil protection.',
    steps: [
      'Allow engine to cool completely; affix cooling system pressure tester to radiator neck and pressurize to 15 PSI for 10 minutes.',
      'Open radiator petcock drain valve and recover old coolant into dedicated recycling container.',
      'Remove thermostat housing, inspect thermostat for scale buildup, and test opening temperature in hot water bath (82°C – 88°C).',
      'Back-flush radiator core and engine cylinder block with pressurized water to dislodge silicate dropout and rust sediment.',
      'Install new thermostat and gasket, refill with 50/50 OAT ethylene glycol coolant, and vacuum purge cooling system of trapped air pockets.'
    ],
    parts: ['Thermostat with Seal (82°C)', 'Radiator Upper & Lower Hose Kit', 'Heavy-Duty 50/50 Pre-Mixed OAT Coolant (4 Gal)', 'Radiator Pressure Cap 1.1 Bar'],
    estimated_hours: 2.0,
    tags: ['cooling', 'radiator', 'thermostat', 'overheating', 'coolant', 'pm-service'],
    createdAt: '2026-09-05T08:30:00Z',
    updatedAt: '2026-09-19T09:15:00Z'
  },
  {
    id: 'art-006',
    category: 'Transmission',
    title: 'Transmission Clutch Adjustment & Fluid Replacement SOP',
    summary: 'Inspection and maintenance guide for measuring clutch pedal free-play, checking hydraulic slave cylinder actuation, and changing gear oil.',
    steps: [
      'Measure clutch pedal free-play at pedal pad (standard clearance: 15mm – 25mm); adjust pushrod clevis if out of specification.',
      'Inspect master and slave cylinder rubber boots for hydraulic fluid leaks; verify smooth fork travel without binding.',
      'Drain transmission manual gear oil into clean catch pan; inspect magnetic drain plug for excessive metallic shavings or gear chips.',
      'Inspect driveshaft universal joints and slip yoke for rotational backlash, needle bearing looseness, or dried grease fittings.',
      'Refill transmission gearbox with SAE 80W-90 GL-4 lubricant until fluid level is flush with filler plug aperture.'
    ],
    parts: ['Clutch Slave Cylinder Assembly', 'Heavy Duty Gear Oil SAE 80W-90 (4 Liters)', 'Transmission Drain Plug Washer', 'Lithium EP Chassis Grease'],
    estimated_hours: 2.5,
    tags: ['transmission', 'clutch', 'gearbox', 'manual', 'slave-cylinder', 'lubrication'],
    createdAt: '2026-09-06T13:00:00Z',
    updatedAt: '2026-09-20T10:45:00Z'
  },
  {
    id: 'art-007',
    category: 'Suspension',
    title: 'Leaf Spring & Kingpin Bushing Play Inspection SOP',
    summary: 'Heavy-vehicle front and rear suspension inspection procedure for kingpin wear, leaf spring crack detection, and U-bolt torque verification.',
    steps: [
      'Raise steer axle off ground on heavy jackstands; place dial indicator on front wheel hub to measure kingpin lateral deflection (max allowable: 0.25mm).',
      'Pump high-pressure lithium grease into upper and lower kingpin grease zerks until fresh grease purges past seals.',
      'Thoroughly inspect front and rear leaf spring packs using inspection mirror and wire brush for cracked or shifted main leaves.',
      'Inspect rubber and bronze spring eye bushings and shackle pins for oval wear or wallowing out.',
      'Check leaf spring U-bolt nuts with calibrated torque wrench (torque to 280–320 N·m in cross-diagonal pattern).'
    ],
    parts: ['Front Kingpin & Bushing Rebuild Kit', 'Leaf Spring Center Bolt & Bushing Set', 'Heavy-Duty U-Bolt & Nut Kit M18', 'Chassis Moly Grease Tube'],
    estimated_hours: 4.0,
    tags: ['suspension', 'leaf-spring', 'kingpin', 'chassis', 'u-bolts', 'alignment'],
    createdAt: '2026-09-07T14:00:00Z',
    updatedAt: '2026-09-21T15:30:00Z'
  },
  {
    id: 'art-008',
    category: 'General',
    title: 'Multi-Point Pre-Trip Vehicle Safety Inspection SOP',
    summary: 'Standard operating checklist covering critical roadworthiness inspection points before releasing transport vehicles into active daily transit.',
    steps: [
      'Check engine oil, coolant, power steering, and brake fluid levels against dipstick / reservoir MAX lines.',
      'Inspect steer and drive tire tread depths with tire depth gauge (minimum legal limit: 3.2mm steer, 1.6mm drive).',
      'Verify all exterior lighting: low beams, high beams, hazard flashers, brake lights, reverse lights, and side clearance markers.',
      'Check steering wheel free play (maximum allowable: 10 degrees or 30mm free play at rim circumference).',
      'Verify fire extinguisher pressure gauge in green zone and emergency warning reflective triangle kit presence.'
    ],
    parts: ['Tire Tread Depth Gauge', 'DOT Safety Emergency Triangle Kit', 'Chemical Fire Extinguisher 5-lb ABC', 'LED Flashlight & Mirror'],
    estimated_hours: 1.0,
    tags: ['general', 'pre-trip', 'safety', 'inspection', 'roadworthiness', 'compliance'],
    createdAt: '2026-09-08T07:00:00Z',
    updatedAt: '2026-09-22T08:00:00Z'
  }
];

const EMPTY_ARTICLE: Omit<KbArticle, 'id'> = {
  category: 'General',
  title: '',
  summary: '',
  steps: [''],
  parts: [''],
  estimated_hours: 1.5,
  tags: [],
};

function getCategoryConfig(cat: string) {
  return CATEGORY_STYLES[cat] || CATEGORY_STYLES.General;
}

function uid() {
  return `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Modal Overlay Wrapper ─────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

// ─── Article Card (Grid View) ─────────────────────────────────────────────────
function ArticleCard({
  article,
  onView,
  onEdit,
  onDelete,
}: {
  article: KbArticle;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const conf = getCategoryConfig(article.category);
  const Icon = conf.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group h-full">
      <div>
        {/* Header row: Category & SLA */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border',
              conf.badgeClass
            )}
          >
            <Icon size={13} className={conf.iconColor} />
            {article.category.toUpperCase()}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold tabular-nums">
            <Clock size={12} className="text-slate-400" />
            ~{article.estimated_hours}h SLA
          </span>
        </div>

        {/* Title */}
        <h3
          onClick={onView}
          className="text-slate-900 font-bold text-base leading-snug line-clamp-2 cursor-pointer group-hover:text-brand-primary transition-colors"
        >
          {article.title}
        </h3>

        {/* Summary */}
        <p className="text-slate-600 text-xs mt-2 line-clamp-2 leading-relaxed">
          {article.summary}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3 min-h-[24px]">
          {article.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-sm"
            >
              <Tag size={10} className="text-slate-400" />
              {tag}
            </span>
          ))}
          {article.tags.length > 3 && (
            <span className="text-[11px] font-medium text-slate-400 self-center">
              +{article.tags.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        {/* Metric Ribbon */}
        <div className="bg-slate-50 rounded-lg px-3 py-2 flex items-center justify-between text-xs text-slate-500 border border-slate-100 mb-3">
          <span className="font-medium text-slate-700">
            {article.steps.length} {article.steps.length === 1 ? 'Step' : 'Steps'}
          </span>
          <span className="text-slate-300">|</span>
          <span>{article.parts.length} {article.parts.length === 1 ? 'Part listed' : 'Parts listed'}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onView}
            className="text-xs font-bold text-brand-primary hover:text-brand-dark flex items-center gap-1 group/btn transition-colors"
          >
            <span>Read SOP</span>
            <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              title="Edit article"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              title="Delete article"
              className="p-1.5 text-slate-400 hover:text-brand-danger hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Article Table (List View) ────────────────────────────────────────────────
function ArticleTable({
  articles,
  onView,
  onEdit,
  onDelete,
}: {
  articles: KbArticle[];
  onView: (art: KbArticle) => void;
  onEdit: (art: KbArticle) => void;
  onDelete: (art: KbArticle) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Procedure Title & Summary</th>
              <th className="py-3 px-4">Est. SLA</th>
              <th className="py-3 px-4">Steps / Parts</th>
              <th className="py-3 px-4">Tags</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {articles.map(article => {
              const conf = getCategoryConfig(article.category);
              const Icon = conf.icon;
              return (
                <tr key={article.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold border',
                        conf.badgeClass
                      )}
                    >
                      <Icon size={12} className={conf.iconColor} />
                      {article.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-md">
                    <button
                      onClick={() => onView(article)}
                      className="font-bold text-slate-900 hover:text-brand-primary text-left block leading-snug transition-colors line-clamp-1"
                    >
                      {article.title}
                    </button>
                    <p className="text-slate-500 text-xs line-clamp-1 mt-0.5">{article.summary}</p>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-xs tabular-nums">
                      <Clock size={12} className="text-slate-400" />
                      ~{article.estimated_hours}h
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{article.steps.length} steps</span>
                    <span className="text-slate-300 mx-1.5">·</span>
                    <span>{article.parts.length} parts</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {article.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200/60"
                        >
                          #{tag}
                        </span>
                      ))}
                      {article.tags.length > 2 && (
                        <span className="text-[11px] text-slate-400 font-mono">+{article.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onView(article)}
                        className="px-2.5 py-1 text-xs font-semibold text-brand-primary hover:bg-blue-50 rounded-sm transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onEdit(article)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onDelete(article)}
                        className="p-1.5 text-slate-400 hover:text-brand-danger hover:bg-red-50 rounded-sm transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── View Modal (Full SOP Reader) ─────────────────────────────────────────────
function ViewModal({
  article,
  onClose,
  onEdit,
}: {
  article: KbArticle;
  onClose: () => void;
  onEdit: () => void;
}) {
  const conf = getCategoryConfig(article.category);
  const Icon = conf.icon;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-brand-dark text-white p-6 sm:p-7 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                  <Icon size={12} className="text-brand-warning" />
                  {article.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-300 font-semibold tabular-nums">
                  <Clock size={12} className="text-brand-warning" />
                  ~{article.estimated_hours} Hours Target SLA
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold leading-tight text-white">{article.title}</h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">{article.summary}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                <Pencil size={13} /> Edit SOP
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-brand-success" />
              <span>{article.steps.length} Verified Diagnostic Steps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wrench size={13} className="text-brand-warning" />
              <span>{article.parts.length} Required Parts & Materials</span>
            </div>
            {article.updatedAt && (
              <div className="text-slate-400">
                Last reviewed: {new Date(article.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-7 flex-1">
          {/* Section: Diagnostic Steps */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-brand-primary" />
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Standard Diagnostic & Repair Procedure
              </h4>
            </div>
            <ol className="space-y-3">
              {article.steps.filter(s => s.trim()).map((step, i) => (
                <li key={i} className="flex items-start gap-3.5 bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                  <span className="w-6 h-6 rounded-md bg-brand-primary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-800 leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Section: Required Parts */}
          {article.parts.filter(p => p.trim()).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-brand-warning" />
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Commonly Required Replacement Parts & Shop Supplies
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {article.parts.filter(p => p.trim()).map((part, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-xs"
                  >
                    <Wrench size={14} className="text-brand-primary shrink-0" />
                    <span>{part}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Tags */}
          {article.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Associated Subsystem Tags
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-sm text-xs font-mono"
                  >
                    <Tag size={11} className="text-slate-400" />
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-mono">ID: {article.id}</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              Close Reader
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-dark text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Pencil size={13} /> Edit Procedure
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Editor Modal (New / Edit Article) ─────────────────────────────────────────
function EditorModal({
  article,
  onSave,
  onClose,
}: {
  article: Partial<KbArticle> | null;
  onSave: (data: KbArticle) => void;
  onClose: () => void;
}) {
  const isNew = !article?.id;
  const [form, setForm] = useState<Omit<KbArticle, 'id'>>({
    ...EMPTY_ARTICLE,
    ...(article
      ? {
          category: article.category || 'General',
          title: article.title || '',
          summary: article.summary || '',
          steps: article.steps?.length ? article.steps : [''],
          parts: article.parts?.length ? article.parts : [''],
          estimated_hours: article.estimated_hours || 1.5,
          tags: article.tags || [],
        }
      : {}),
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.summary.trim()) e.summary = 'Summary is required';
    if (!form.steps.some(s => s.trim())) e.steps = 'At least one step is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: article?.id || uid(),
      ...form,
      steps: form.steps.filter(s => s.trim()),
      parts: form.parts.filter(p => p.trim()),
      createdAt: article?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const updateList = (key: 'steps' | 'parts', idx: number, val: string) => {
    const arr = [...form[key]];
    arr[idx] = val;
    setForm(f => ({ ...f, [key]: arr }));
  };

  const addListItem = (key: 'steps' | 'parts') => {
    setForm(f => ({ ...f, [key]: [...f[key], ''] }));
  };

  const removeListItem = (key: 'steps' | 'parts', idx: number) => {
    if (form[key].length <= 1) return;
    setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }));
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {isNew ? 'New Standard Operating Procedure' : 'Edit Operating Procedure'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill out diagnostic procedures and parts for fleet technicians
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white hover:bg-slate-200 border border-slate-200 text-slate-500 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Form */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Procedure Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => {
                  setForm(f => ({ ...f, title: e.target.value }));
                  if (errors.title) setErrors(er => ({ ...er, title: '' }));
                }}
                placeholder="e.g. Brake Caliper & Slider Pin Overhaul SOP"
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-primary transition-all',
                  errors.title ? 'border-brand-danger' : 'border-slate-300'
                )}
              />
              {errors.title && <span className="text-xs text-brand-danger mt-1 block">{errors.title}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Subsystem
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer"
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Summary & Scope *
            </label>
            <textarea
              rows={2}
              value={form.summary}
              onChange={e => {
                setForm(f => ({ ...f, summary: e.target.value }));
                if (errors.summary) setErrors(er => ({ ...er, summary: '' }));
              }}
              placeholder="Brief overview of the maintenance procedure, symptoms addressed, and scope..."
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-primary transition-all',
                errors.summary ? 'border-brand-danger' : 'border-slate-300'
              )}
            />
            {errors.summary && <span className="text-xs text-brand-danger mt-1 block">{errors.summary}</span>}
          </div>

          {/* Est. Hours */}
          <div className="w-48">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target SLA (Hours)
            </label>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={form.estimated_hours}
                onChange={e => setForm(f => ({ ...f, estimated_hours: parseFloat(e.target.value) || 1 }))}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Diagnostic Steps List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Diagnostic & Service Steps *
              </label>
              <button
                type="button"
                onClick={() => addListItem('steps')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-dark"
              >
                <Plus size={13} /> Add Step
              </button>
            </div>
            {errors.steps && <span className="text-xs text-brand-danger mb-2 block">{errors.steps}</span>}
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={step}
                    onChange={e => updateList('steps', i, e.target.value)}
                    placeholder={`Step ${i + 1} action or verification checkpoint...`}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={() => removeListItem('steps', i)}
                    disabled={form.steps.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Parts List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Commonly Needed Replacement Parts
              </label>
              <button
                type="button"
                onClick={() => addListItem('parts')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-dark"
              >
                <Plus size={13} /> Add Part
              </button>
            </div>
            <div className="space-y-2">
              {form.parts.map((part, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Wrench size={14} className="text-slate-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={part}
                    onChange={e => updateList('parts', i, e.target.value)}
                    placeholder="e.g. Brake Caliper Seal Kit (Part #BC-992)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={() => removeListItem('parts', i)}
                    disabled={form.parts.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Subsystem & Search Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Type tag (e.g. calipers) and press Enter..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-primary"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-dark text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save size={14} /> {isNew ? 'Create SOP' : 'Save Changes'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  article,
  onConfirm,
  onClose,
}: {
  article: KbArticle;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-900 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-brand-danger flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} />
        </div>
        <h3 className="text-base font-bold text-slate-900">Delete Operating Procedure?</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Are you sure you want to permanently remove <strong className="text-slate-800">"{article.title}"</strong> from the Knowledge Base? This action cannot be undone.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-brand-danger hover:bg-red-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Yes, Delete SOP
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-slide-up backdrop-blur-md',
        type === 'success'
          ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700'
          : 'bg-red-900/90 text-red-100 border-red-700'
      )}
    >
      {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 text-white/60 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Main Knowledge Base Page ─────────────────────────────────────────────────
// Local copy first, then the AI service, then the built in SOP catalog
async function loadInitialArticles(): Promise<KbArticle[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    try {
      const remote = await getKnowledgeArticles<KbArticle>();
      if (remote.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        return remote;
      }
    } catch {
      // fall back to the seed below
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ARTICLES));
    return DEFAULT_ARTICLES;
  } catch {
    return DEFAULT_ARTICLES;
  }
}

export function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryType>('All');
  const [sortBy, setSortBy] = useState<'alpha' | 'hours-asc' | 'hours-desc' | 'category'>('alpha');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [viewArticle, setViewArticle] = useState<KbArticle | null>(null);
  const [editArticle, setEditArticle] = useState<Partial<KbArticle> | null | 'new'>(null);
  const [deleteArticle, setDeleteArticle] = useState<KbArticle | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Load articles
  useEffect(() => {
    let cancelled = false;
    loadInitialArticles().then(loaded => {
      if (cancelled) return;
      setArticles(loaded);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const persist = (updated: KbArticle[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setArticles(updated);
  };

  const handleSave = (data: KbArticle) => {
    const existing = articles.find(a => a.id === data.id);
    const updated = existing
      ? articles.map(a => (a.id === data.id ? data : a))
      : [data, ...articles];
    persist(updated);
    setEditArticle(null);
    showToast(existing ? 'SOP updated successfully' : 'New SOP created successfully');
  };

  const handleDelete = (article: KbArticle) => {
    persist(articles.filter(a => a.id !== article.id));
    setDeleteArticle(null);
    if (viewArticle?.id === article.id) setViewArticle(null);
    showToast('SOP deleted from knowledge base', 'error');
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const remote = await getKnowledgeArticles<KbArticle>();
      if (remote.length > 0) {
        persist(remote);
        showToast('Synchronized with AI Knowledge Base');
        return;
      }
      // If server doesn't respond or has no articles, reset to defaults
      persist(DEFAULT_ARTICLES);
      showToast('Reset to standard fleet SOP catalog');
    } catch {
      persist(DEFAULT_ARTICLES);
      showToast('Reset to standard fleet SOP catalog');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered & sorted articles
  const filtered = useMemo(() => {
    return articles
      .filter(a => category === 'All' || a.category === category)
      .filter(a => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.tags.some(t => t.toLowerCase().includes(q)) ||
          a.parts.some(p => p.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'hours-asc') return a.estimated_hours - b.estimated_hours;
        if (sortBy === 'hours-desc') return b.estimated_hours - a.estimated_hours;
        if (sortBy === 'category') return a.category.localeCompare(b.category);
        return a.title.localeCompare(b.title);
      });
  }, [articles, category, search, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = articles.length;
    const avgHours = total > 0 ? articles.reduce((acc, a) => acc + (a.estimated_hours || 0), 0) / total : 0;
    const uniqueCats = new Set(articles.map(a => a.category)).size;
    const totalSteps = articles.reduce((acc, a) => acc + a.steps.length, 0);
    const totalParts = articles.reduce((acc, a) => acc + a.parts.length, 0);
    return { total, avgHours, uniqueCats, totalSteps, totalParts };
  }, [articles]);

  // Category counts
  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of CATEGORIES) {
      map[c] = c === 'All' ? articles.length : articles.filter(a => a.category === c).length;
    }
    return map;
  }, [articles]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <PageHeader
          title="Knowledge Base & SOP Library"
          subtitle="Mechanic Resource Center — Standard Operating Procedures, diagnostic guides, and component repair workflows."
          icon={BookOpen}
        />
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors disabled:opacity-60"
          >
            <RefreshCw size={13} className={cn(isSyncing && 'animate-spin text-brand-primary')} />
            {isSyncing ? 'Syncing...' : 'Sync Catalog'}
          </button>
          <button
            onClick={() => setEditArticle('new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-dark text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={15} />
            New SOP
          </button>
        </div>
      </div>

      {/* ── Top Executive KPI Metrics (Tremor / One UI Style) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active SOPs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-primary flex items-center justify-center">
              <BookOpen size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {stats.total}
          </div>
          <p className="mt-1 text-xs text-slate-500">Documented workshop guides</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Labor SLA</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            ~{stats.avgHours.toFixed(1)}h
          </div>
          <p className="mt-1 text-xs text-slate-500">Standard resolution benchmark</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Subsystems</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {stats.uniqueCats} Modules
          </div>
          <p className="mt-1 text-xs text-slate-500">Engine, Brakes, Transmission...</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Steps & Supplies</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {stats.totalSteps} Steps
          </div>
          <p className="mt-1 text-xs text-slate-500">Across {stats.totalParts} inventory parts</p>
        </div>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        {/* Row 1: Search + Sort + View Mode */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by procedure name, symptom, replacement part, or #tag..."
              className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-primary transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-brand-primary transition-colors cursor-pointer w-full sm:w-auto"
            >
              <option value="alpha">Sort: Alphabetical (A → Z)</option>
              <option value="category">Sort: Subsystem Category</option>
              <option value="hours-asc">Sort: SLA (Lowest First)</option>
              <option value="hours-desc">Sort: SLA (Highest First)</option>
            </select>

            {/* View Mode Toggle: Grid vs Table */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white text-brand-primary shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                )}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-white text-brand-primary shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                )}
                title="Table View"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Subsystem Category Tabs (Segmented control) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {CATEGORIES.map(cat => {
            const count = catCounts[cat] || 0;
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                  active
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                )}
              >
                <span>{cat}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content View (Grid or Table) ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-56 bg-white border border-slate-200 rounded-xl p-5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <BookOpen size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No procedures found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {search || category !== 'All'
              ? 'No operating procedures match your search filters. Try clearing your search query or switching categories.'
              : 'The knowledge base library is empty. Click "+ New SOP" to record the first procedure.'}
          </p>
          {(search || category !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setCategory('All');
              }}
              className="mt-4 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-primary border border-slate-200 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(art => (
            <ArticleCard
              key={art.id}
              article={art}
              onView={() => setViewArticle(art)}
              onEdit={() => setEditArticle(art)}
              onDelete={() => setDeleteArticle(art)}
            />
          ))}
        </div>
      ) : (
        <ArticleTable
          articles={filtered}
          onView={art => setViewArticle(art)}
          onEdit={art => setEditArticle(art)}
          onDelete={art => setDeleteArticle(art)}
        />
      )}

      {/* ── Modals ── */}
      {viewArticle && (
        <ViewModal
          article={viewArticle}
          onClose={() => setViewArticle(null)}
          onEdit={() => {
            setEditArticle(viewArticle);
            setViewArticle(null);
          }}
        />
      )}

      {editArticle !== null && (
        <EditorModal
          article={editArticle === 'new' ? null : editArticle}
          onSave={handleSave}
          onClose={() => setEditArticle(null)}
        />
      )}

      {deleteArticle && (
        <DeleteModal
          article={deleteArticle}
          onConfirm={() => handleDelete(deleteArticle)}
          onClose={() => setDeleteArticle(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
