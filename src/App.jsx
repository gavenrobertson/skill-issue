import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  Gauge,
  Home,
  Layers3,
  Menu,
  MessageSquareText,
  Paperclip,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import './App.css'

const navItems = [
  { label: 'Dashboard', icon: Home, active: true },
  { label: 'Training', icon: ClipboardList },
  { label: 'My Training', icon: ShieldCheck },
  { label: 'Reports', icon: FileBarChart2 },
  { label: 'Users', icon: Users },
  { label: 'Groups', icon: Layers3 },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Announcements', icon: MessageSquareText },
  { label: 'Admin', icon: Gauge },
  { label: 'Settings', icon: Settings },
]

const stats = [
  { label: 'Overall Compliance', value: '87%', detail: '+5% from last month', tone: 'good' },
  { label: 'Total Users', value: '248', detail: '+12 new this month', tone: 'neutral' },
  { label: 'Training Overdue', value: '31', detail: '-8 from last month', tone: 'danger' },
  { label: 'Due This Month', value: '42', detail: '+3 from last month', tone: 'neutral' },
]

const dueSoon = [
  ['Cyber Awareness Challenge', 'Due in 7 days', '48 users'],
  ['Secure Communications Refresher', 'Due in 10 days', '22 users'],
  ['OPSEC Level I', 'Due in 14 days', '15 users'],
  ['Privacy Act Refresher', 'Due in 20 days', '8 users'],
]

const trainingRows = [
  ['Cyber Awareness Challenge', 'Required', 'Annual', '31 May 2024', 'In Progress', '248'],
  ['Secure Communications Refresher', 'Required', 'Annual', '3 Jun 2024', 'Not Started', '248'],
  ['OPSEC Level I', 'Required', 'Annual', '7 Jun 2024', 'Completed', '248'],
  ['Privacy Act Refresher', 'Required', 'Annual', '16 Jun 2024', 'In Progress', '248'],
  ['Insider Threat Awareness', 'Required', 'Annual', '20 Jun 2024', 'Not Started', '248'],
  ['Phishing Awareness', 'Elective', 'Annual', '28 Jun 2024', 'In Progress', '142'],
]

const mobileTrainings = [
  ['Cyber Awareness Challenge', 'In Progress', '60'],
  ['Secure Communications Refresher', 'Not Started', '0'],
  ['OPSEC Level I', 'Completed', '100'],
  ['Privacy Act Refresher', 'In Progress', '90'],
]

const reportLinks = [
  'Compliance Report',
  'Training Status Report',
  'Overdue Training Report',
]

function App() {
  return (
    <main className="workspace">
      <BrandPanel />
      <section className="showcase">
        <header className="showcase-header">
          <p>1. Dashboard (Home)</p>
          <p>2. Mobile App (Responsive)</p>
        </header>

        <div className="hero-grid">
          <Dashboard />
          <MobilePreview />
        </div>

        <div className="secondary-grid">
          <TrainingView />
          <UserProgress />
          <AdditionalPages />
        </div>

        <LogoStrip />
      </section>
    </main>
  )
}

function LogoMark({ small = false }) {
  return (
    <div className={small ? 'logo-mark small' : 'logo-mark'} aria-hidden="true">
      <ClipboardCheck size={small ? 22 : 36} strokeWidth={2.4} />
    </div>
  )
}

function BrandLockup({ light = false }) {
  return (
    <div className={light ? 'brand-lockup light' : 'brand-lockup'}>
      <LogoMark small />
      <div>
        <strong>SkillIssue</strong>
        <span>Track. Train. Ready.</span>
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="brand-panel">
      <section className="brand-card dark-card">
        <LogoMark />
        <h1>SkillIssue</h1>
        <p>Track. Train. Ready.</p>
        <span>Ancillary Training Tracker for the Air Force Software Factory</span>
      </section>

      <section className="brand-card">
        <h2>Brand Identity</h2>
        <div className="identity-row">
          <div>
            <small>Logo</small>
            <BrandLockup />
          </div>
          <div>
            <small>Icon Mark</small>
            <LogoMark />
          </div>
        </div>
      </section>

      <section className="brand-card">
        <h2>Color Palette</h2>
        <div className="swatches">
          {['#6d20d8', '#8b35ea', '#b26cff', '#101827', '#f5f4f0'].map((color) => (
            <div className="swatch" key={color}>
              <span style={{ background: color }} />
              <code>{color}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="brand-card typography">
        <h2>Typography</h2>
        <div>
          <strong>Aa</strong>
          <p>Inter</p>
          <span>ABCDEFGHIJKLMNOPQRSTUVWXYZ</span>
          <span>abcdefghijklmnopqrstuvwxyz</span>
          <span>0123456789</span>
        </div>
      </section>

      <section className="brand-card">
        <h2>Buttons</h2>
        <div className="button-row">
          <button className="primary-btn" type="button">Primary Button</button>
          <button className="secondary-btn" type="button">Secondary</button>
          <a href="#reports">Text Link +</a>
        </div>
      </section>

      <section className="brand-card">
        <h2>Status Badges</h2>
        <div className="badge-row">
          <StatusBadge status="Completed" />
          <StatusBadge status="In Progress" />
          <StatusBadge status="Overdue" />
          <StatusBadge status="Not Started" />
        </div>
      </section>
    </aside>
  )
}

function Shell({ active = 'Dashboard', children, compact = false }) {
  return (
    <div className={compact ? 'app-shell compact' : 'app-shell'}>
      <aside className="sidebar">
        <BrandLockup light />
        <nav aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button className={label === active ? 'active' : ''} key={label} type="button">
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="profile-chip">
          <div>TS</div>
          <span>
            TSgt Jane Doe
            <small>Training Manager</small>
          </span>
        </div>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  )
}

function Dashboard() {
  return (
    <section className="panel dashboard-panel" aria-label="Dashboard preview">
      <Shell>
        <header className="topbar">
          <div>
            <h2>Welcome back, TSgt Jane Doe</h2>
            <p>Here's what's happening with your training program.</p>
          </div>
          <div className="top-actions">
            <Bell size={18} />
            <button className="primary-btn" type="button">Export Report</button>
          </div>
        </header>

        <div className="stats-grid">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small className={stat.tone}>{stat.detail}</small>
            </article>
          ))}
        </div>

        <div className="dashboard-grid">
          <article className="content-card compliance">
            <h3>Compliance Overview</h3>
            <div className="compliance-body">
              <div className="donut" aria-label="87 percent compliant">
                <span>87%</span>
                <small>Compliant</small>
              </div>
              <ul>
                <li><b className="green" />Compliant <span>216 (87%)</span></li>
                <li><b className="yellow" />In Progress <span>18 (7%)</span></li>
                <li><b className="red" />Overdue <span>14 (6%)</span></li>
                <li><b className="gray" />Not Started <span>0 (0%)</span></li>
              </ul>
            </div>
            <a href="#reports">View full report +</a>
          </article>

          <article className="content-card">
            <div className="card-title">
              <h3>Training Due Soon</h3>
              <a href="#training">View All</a>
            </div>
            <TrainingList />
          </article>
        </div>

        <article className="content-card announcements">
          <MessageSquareText size={22} />
          <div>
            <h3>Recent Announcements</h3>
            <p>Annual training audit begins 1 Jun 2026. Ensure all records are up to date.</p>
          </div>
          <a href="#announcements">View All</a>
        </article>
      </Shell>
    </section>
  )
}

function TrainingList() {
  return (
    <div className="training-list">
      {dueSoon.map(([name, due, users]) => (
        <div className="training-item" key={name}>
          <ClipboardCheck size={18} />
          <span>
            <strong>{name}</strong>
            <small>{due} - {users}</small>
          </span>
        </div>
      ))}
    </div>
  )
}

function MobilePreview() {
  return (
    <section className="mobile-wrap" aria-label="Mobile responsive previews">
      <PhoneFrame>
        <div className="mobile-head">
          <BrandLockup />
          <Menu size={18} />
        </div>
        <h3>Welcome back, TSgt Jane Doe</h3>
        <article className="mobile-card">
          <span>Overall Compliance</span>
          <strong>87%</strong>
          <small>+5% from last month</small>
          <div className="sparkline" />
        </article>
        <article className="mobile-card">
          <div className="card-title">
            <h4>Training Due Soon</h4>
            <a href="#training">View All</a>
          </div>
          <TrainingList />
        </article>
        <MobileTabs />
      </PhoneFrame>

      <PhoneFrame>
        <div className="mobile-head centered">
          <Search size={17} />
          <strong>My Training</strong>
          <Menu size={17} />
        </div>
        <div className="segmented">
          <button className="active" type="button">All</button>
          <button type="button">In Progress</button>
          <button type="button">Completed</button>
          <button type="button">Overdue</button>
        </div>
        <div className="mobile-progress-list">
          {mobileTrainings.map(([name, status, percent]) => (
            <article key={name}>
              <ClipboardCheck size={18} />
              <span>
                <strong>{name}</strong>
                <small>{status}</small>
                <i><b style={{ width: `${percent}%` }} /></i>
              </span>
              <em>{percent}%</em>
            </article>
          ))}
        </div>
        <MobileTabs active="My Training" />
      </PhoneFrame>
    </section>
  )
}

function PhoneFrame({ children }) {
  return (
    <div className="phone">
      <div className="notch" />
      <div className="phone-screen">{children}</div>
    </div>
  )
}

function MobileTabs({ active = 'Dashboard' }) {
  const tabs = [
    ['Dashboard', Home],
    ['My Training', ShieldCheck],
    ['Reports', FileBarChart2],
    ['More', Menu],
  ]
  return (
    <nav className="mobile-tabs" aria-label="Mobile navigation">
      {tabs.map(([label, Icon]) => (
        <button className={label === active ? 'active' : ''} key={label} type="button">
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function TrainingView() {
  return (
    <section className="panel">
      <p className="section-label">3. Training Tracking View</p>
      <Shell active="Training" compact>
        <header className="table-header">
          <h2>Training</h2>
          <Bell size={18} />
        </header>
        <div className="tabs">
          {['All Training', 'Required', 'Electives', 'Mandatory'].map((tab, index) => (
            <button className={index === 0 ? 'active' : ''} key={tab} type="button">{tab}</button>
          ))}
        </div>
        <div className="filters">
          <label>
            <Search size={15} />
            <input aria-label="Search training" placeholder="Search training..." />
          </label>
          <button className="secondary-btn" type="button">Filter</button>
          <button className="secondary-btn" type="button">Group By</button>
          <button className="primary-btn" type="button">Add Training</button>
        </div>
        <TrainingTable />
      </Shell>
    </section>
  )
}

function TrainingTable() {
  return (
    <div className="training-table" id="training">
      <div className="row header">
        <span>Training Name</span>
        <span>Type</span>
        <span>Frequency</span>
        <span>Due Date</span>
        <span>Status</span>
        <span>Users</span>
      </div>
      {trainingRows.map((row) => (
        <div className="row" key={row[0]}>
          {row.map((cell, index) => (
            index === 4 ? <StatusBadge key={cell} status={cell} /> : <span key={cell}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const className = status.toLowerCase().replace(/\s+/g, '-')
  return <span className={`status ${className}`}>{status}</span>
}

function UserProgress() {
  return (
    <section className="panel">
      <p className="section-label">4. User Progress / Compliance</p>
      <Shell active="Users" compact>
        <header className="table-header">
          <h2>User Details</h2>
          <Search size={18} />
        </header>
        <div className="user-summary">
          <div className="avatar">AJ</div>
          <div>
            <h3>TSgt Alex Smith</h3>
            <p>Development Lead</p>
          </div>
        </div>
        <div className="metrics">
          {[
            ['Overall', '92%'],
            ['Overall Compliance', '92%'],
            ['Assigned Training', '11/12'],
            ['Overdue', '1'],
          ].map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        <div className="tabs">
          {['Training Progress', 'Profile', 'Groups', 'History'].map((tab, index) => (
            <button className={index === 0 ? 'active' : ''} key={tab} type="button">{tab}</button>
          ))}
        </div>
        <TrainingTable />
      </Shell>
    </section>
  )
}

function AdditionalPages() {
  return (
    <section className="additional" id="reports">
      <p className="section-label">5. Additional Pages</p>
      <div className="additional-grid">
        <article className="info-card about-card">
          <h3>About SkillIssue</h3>
          <p>SkillIssue is an ancillary training tracker built for the Air Force Software Factory to simplify training, reporting, and compliance management.</p>
          <ul>
            <li>Built for Airmen, by Airmen</li>
            <li>Secure, reliable, compliant</li>
            <li>Track, train, ready</li>
          </ul>
          <LogoMark />
        </article>
        <article className="info-card reports-card">
          <h3>Reports</h3>
          {reportLinks.map((link) => (
            <button type="button" key={link}>
              <FileBarChart2 size={18} />
              <span>{link}<small>Generate summary</small></span>
              <Paperclip size={15} />
            </button>
          ))}
          <button className="primary-btn" type="button">Custom Report Builder</button>
        </article>
        <article className="info-card">
          <h3>Contact</h3>
          <p>Have questions or need help? We're here to help.</p>
          <dl>
            <div><dt>Email</dt><dd>skillissue@us.af.mil</dd></div>
            <div><dt>DSN</dt><dd>555-1234</dd></div>
            <div><dt>Comm</dt><dd>(719) 555-1234</dd></div>
          </dl>
        </article>
        <article className="info-card settings-card">
          <h3>Admin Settings</h3>
          {['Training Categories', 'Users & Permissions', 'Groups', 'System Settings', 'Audit Logs'].map((item) => (
            <button type="button" key={item}>
              <Settings size={15} />
              <span>{item}</span>
            </button>
          ))}
        </article>
      </div>
    </section>
  )
}

function LogoStrip() {
  return (
    <section className="logo-strip">
      <p className="section-label">6. Brand Variations (Logo Options)</p>
      <div>
        <BrandLockup />
        <BrandLockup light />
        <BrandLockup light />
        <BrandLockup />
        <BrandLockup light />
      </div>
    </section>
  )
}

export default App
