import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileBarChart2,
  Gauge,
  Home,
  Layers3,
  Megaphone,
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
  { label: 'Announcements', icon: Megaphone },
  { label: 'Admin', icon: Gauge },
  { label: 'Settings', icon: Settings },
]

const stats = [
  {
    label: 'Overall Compliance',
    value: '87%',
    detail: '+5% from last month',
    tone: 'positive',
  },
  {
    label: 'Total Users',
    value: '248',
    detail: '+12 new this month',
    tone: 'positive',
  },
  {
    label: 'Training Overdue',
    value: '31',
    detail: '-8 from last month',
    tone: 'negative',
  },
  {
    label: 'Due This Month',
    value: '42',
    detail: '+3 from last month',
    tone: 'positive',
  },
]

const compliance = [
  { label: 'Compliant', value: '216 (87%)', color: 'green' },
  { label: 'In Progress', value: '18 (7%)', color: 'yellow' },
  { label: 'Overdue', value: '14 (6%)', color: 'red' },
  { label: 'Not Started', value: '0 (0%)', color: 'gray' },
]

const dueSoon = [
  ['Cyber Awareness Challenge', 'Due in 7 days - 48 users'],
  ['Secure Communications Refresher', 'Due in 10 days - 22 users'],
  ['OPSEC Level I', 'Due in 14 days - 15 users'],
  ['Privacy Act Refresher', 'Due in 20 days - 8 users'],
]

function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="SkillIssue navigation">
        <Brand />

        <nav>
          {navItems.map(({ label, icon: Icon, active }) => (
            <button className={active ? 'active' : ''} key={label} type="button">
              <Icon size={18} strokeWidth={2.2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="manager-card">
          <div className="avatar">TS</div>
          <span>
            TSgt Jane Doe
            <small>Training Manager</small>
          </span>
        </div>
      </aside>

      <section className="dashboard" aria-label="Dashboard home">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">1. Dashboard (Home)</p>
            <h1>Welcome back, TSgt Jane Doe</h1>
            <span>Here's what's happening with your training program.</span>
          </div>

          <div className="header-actions">
            <button className="icon-button" aria-label="Notifications" type="button">
              <Bell size={19} />
              <i />
            </button>
            <button className="primary-button" type="button">
              <Download size={16} />
              Export Report
            </button>
          </div>
        </header>

        <section className="stats-grid" aria-label="Training statistics">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <span className={stat.tone}>{stat.detail}</span>
            </article>
          ))}
        </section>

        <section className="main-grid">
          <article className="panel compliance-card">
            <div className="panel-header">
              <h2>Compliance Overview</h2>
            </div>

            <div className="compliance-layout">
              <div className="donut" aria-label="87 percent compliant">
                <strong>87%</strong>
                <span>Compliant</span>
              </div>

              <div className="legend">
                {compliance.map((item) => (
                  <div className="legend-row" key={item.label}>
                    <b className={item.color} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <a href="#reports">View full report +</a>
          </article>

          <article className="panel due-card" id="training">
            <div className="panel-header">
              <h2>Training Due Soon</h2>
              <a href="#training">View All</a>
            </div>

            <div className="due-list">
              {dueSoon.map(([title, subtitle]) => (
                <div className="due-item" key={title}>
                  <div>
                    <ClipboardCheck size={18} />
                  </div>
                  <span>
                    <strong>{title}</strong>
                    <small>{subtitle}</small>
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="announcement panel" id="announcements">
          <div className="announcement-icon">
            <Megaphone size={22} />
          </div>
          <div>
            <h2>Recent Announcements</h2>
            <p>Annual training audit begins 1 Jun 2026. Ensure all records are up to date.</p>
          </div>
          <a href="#announcements">View All</a>
        </section>

        <span id="reports" className="anchor-target" aria-hidden="true" />
      </section>
    </main>
  )
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">
        <ClipboardCheck size={26} strokeWidth={2.5} />
      </div>
      <div>
        <strong>SkillIssue</strong>
        <span>Track. Train. Ready.</span>
      </div>
    </div>
  )
}

export default App
