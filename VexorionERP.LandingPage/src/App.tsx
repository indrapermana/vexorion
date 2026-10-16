const loginUrl = 'https://app.vexorionerp.com/login'

const modules = [
  {
    number: '01',
    title: 'Sales & customers',
    description: 'Keep customers, sales orders, shipments, invoices, and payments moving through one connected flow.',
  },
  {
    number: '02',
    title: 'Purchasing & suppliers',
    description: 'Coordinate suppliers, purchase orders, receipts, invoices, and vendor payments with clearer handoffs.',
  },
  {
    number: '03',
    title: 'Inventory',
    description: 'Manage products, warehouses, stock counts, transfers, and adjustments across day-to-day operations.',
  },
  {
    number: '04',
    title: 'Finance & reporting',
    description: 'Organize accounts, journals, fiscal periods, tax configuration, and operational reporting.',
  },
  {
    number: '05',
    title: 'Projects & people',
    description: 'Bring projects, documents, assignments, employees, and consultants into the same working context.',
  },
  {
    number: '06',
    title: 'Administration & POS',
    description: 'Support tenant administration, roles, users, module configuration, and point-of-sale workflows.',
  },
]

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="VexorionERP home">
      <span className="brand__mark" aria-hidden="true">V</span>
      <span>Vexorion<span>ERP</span></span>
    </a>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

function App() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#platform">Platform</a>
            <a href="#workflow">How it connects</a>
            <a href="#modules">Modules</a>
          </nav>
          <a className="button button--small button--ghost" href={loginUrl}>
            Log in <ArrowIcon />
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__glow hero__glow--one" />
          <div className="hero__glow hero__glow--two" />
          <div className="container hero__grid">
            <div className="hero__copy">
              <p className="eyebrow"><span /> Built for connected operations</p>
              <h1 id="hero-title">Run the work.<br /><em>See the whole.</em></h1>
              <p className="hero__lead">
                VexorionERP brings the everyday work of sales, purchasing, inventory,
                finance, projects, and point of sale into one coordinated workspace.
              </p>
              <div className="hero__actions">
                <a className="button button--primary" href={loginUrl}>Open your workspace <ArrowIcon /></a>
                <a className="text-link" href="#platform">Explore the platform <span aria-hidden="true">↓</span></a>
              </div>
              <div className="hero__note">
                <span className="hero__note-icon" aria-hidden="true">✦</span>
                <p><strong>One operational source of context</strong><br />From first order to financial record.</p>
              </div>
            </div>

            <div className="product-scene" aria-label="Illustration of the VexorionERP operations dashboard">
              <div className="product-scene__orbit product-scene__orbit--one" />
              <div className="product-scene__orbit product-scene__orbit--two" />
              <div className="app-window">
                <div className="app-window__bar">
                  <div className="app-window__brand"><span>V</span> VexorionERP</div>
                  <div className="window-dots"><i /><i /><i /></div>
                </div>
                <div className="app-window__body">
                  <aside className="app-sidebar" aria-hidden="true">
                    <i className="active" /><i /><i /><i /><i />
                  </aside>
                  <div className="app-content">
                    <div className="app-heading">
                      <div><small>OPERATIONS</small><strong>Good morning</strong></div>
                      <span className="avatar">IP</span>
                    </div>
                    <div className="metric-grid">
                      <div className="metric metric--violet"><small>REVENUE</small><strong>Overview</strong><span className="spark"><i /><i /><i /><i /><i /></span></div>
                      <div className="metric"><small>ORDERS</small><strong>In progress</strong><span className="mini-ring" /></div>
                      <div className="metric"><small>INVENTORY</small><strong>Stock status</strong><span className="status-line"><i /><i /><i /></span></div>
                    </div>
                    <div className="activity-card">
                      <div className="activity-card__head"><strong>Operational flow</strong><small>THIS WEEK</small></div>
                      <div className="chart" aria-hidden="true">
                        <span className="chart__line" />
                        <span className="chart__fill" />
                        <i style={{ left: '13%', bottom: '25%' }} /><i style={{ left: '35%', bottom: '49%' }} />
                        <i style={{ left: '58%', bottom: '41%' }} /><i style={{ left: '82%', bottom: '71%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="floating-card floating-card--status">
                <span className="floating-card__icon">✓</span>
                <div><small>STATUS</small><strong>Work connected</strong></div>
              </div>
              <div className="floating-card floating-card--modules">
                <small>ACTIVE AREAS</small>
                <div><i>SA</i><i>IN</i><i>FI</i><i>PR</i></div>
              </div>
            </div>
          </div>
          <div className="container trust-strip">
            <p>ONE PLATFORM FOR</p>
            <div><span>Finance</span><i /> <span>Sales</span><i /> <span>Inventory</span><i /> <span>Projects</span><i /> <span>Point of sale</span></div>
          </div>
        </section>

        <section className="platform section" id="platform">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow eyebrow--dark"><span /> A clearer operating picture</p><h2>Less fragmentation.<br /><em>More flow.</em></h2></div>
              <p>Give each team the tools for its work while keeping the information around customers, suppliers, products, projects, and financial activity connected.</p>
            </div>
            <div className="principles">
              <article><span>01</span><div className="principle-icon">⌁</div><h3>Connected records</h3><p>Operational activity stays linked as work moves between teams and modules.</p></article>
              <article className="principles__featured"><span>02</span><div className="principle-icon">◎</div><h3>Role-aware workspaces</h3><p>Separate main, administration, and point-of-sale experiences support distinct responsibilities.</p></article>
              <article><span>03</span><div className="principle-icon">↗</div><h3>Visible progress</h3><p>Dashboards, status, audit history, and reports make activity easier to follow.</p></article>
            </div>
          </div>
        </section>

        <section className="flow section" id="workflow">
          <div className="container flow__grid">
            <div className="flow__visual">
              <div className="flow-node flow-node--customer"><small>START</small><strong>Customer need</strong></div>
              <div className="flow-line flow-line--one" />
              <div className="flow-node flow-node--order"><small>SALES</small><strong>Order</strong></div>
              <div className="flow-line flow-line--two" />
              <div className="flow-node flow-node--stock"><small>INVENTORY</small><strong>Fulfilment</strong></div>
              <div className="flow-line flow-line--three" />
              <div className="flow-node flow-node--finance"><small>FINANCE</small><strong>Invoice & payment</strong></div>
              <div className="flow-badge">One continuous context</div>
            </div>
            <div className="flow__copy">
              <p className="eyebrow"><span /> Designed around real handoffs</p>
              <h2>Follow the work,<br /><em>not the spreadsheet.</em></h2>
              <p>VexorionERP models the operational path from an initial transaction through inventory and finance, helping teams work with the same underlying context.</p>
              <ul>
                <li><span>✓</span> Structured workflows across core modules</li>
                <li><span>✓</span> Tenant, user, and role administration</li>
                <li><span>✓</span> Audit history for accountable operations</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="modules section" id="modules">
          <div className="container">
            <div className="section-heading section-heading--center">
              <div><p className="eyebrow eyebrow--dark"><span /> Capabilities</p><h2>Essential work,<br /><em>in one system.</em></h2></div>
              <p>Use the areas that fit your operation while maintaining a shared foundation for information and access.</p>
            </div>
            <div className="module-grid">
              {modules.map((module) => (
                <article key={module.number}>
                  <span>{module.number}</span>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <i aria-hidden="true">↗</i>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-card">
            <div className="cta-card__rings" />
            <div>
              <p className="eyebrow"><span /> Your workspace is ready</p>
              <h2>Bring the moving parts<br /><em>into focus.</em></h2>
            </div>
            <a className="button button--light" href={loginUrl}>Log in to VexorionERP <ArrowIcon /></a>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <Brand />
          <p>Connected operations for growing businesses.</p>
          <p>© {new Date().getFullYear()} VexorionERP</p>
        </div>
      </footer>
    </>
  )
}

export default App
