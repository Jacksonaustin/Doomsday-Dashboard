import { Link } from 'react-router-dom'
import BrandArtwork from '../components/BrandArtwork.jsx'
import Icon from '../components/Icon.jsx'

// These cards describe planned features; they don't display sample user data.
const features = [
  {
    icon: 'package',
    tag: '01 / ORGANIZE',
    title: 'Know what you have.',
    body: 'Keep food, water, medical essentials, and other supplies organized in one inventory. Track quantities and changes over time.',
  },
  {
    icon: 'chart',
    tag: '02 / SIMULATE',
    title: 'Plan for the unknown.',
    body: 'Explore emergency scenarios and estimate how long your recorded supplies could last using clear, adjustable assumptions.',
  },
  {
    icon: 'brain',
    tag: '03 / IMPROVE',
    title: 'Close the gaps.',
    body: 'Get prioritized, AI-assisted suggestions based on your household needs and the resources you already have.',
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Landing section: product introduction and navigation to registration. */}
      <section className="hero-section">
        <div className="hero-grid-overlay" aria-hidden="true" />

        <div className="page-container hero-layout">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              YOUR READINESS STARTS HERE
              <span className="eyebrow-index">/ 001</span>
            </div>

            <h1>
              WHEN THE WORLD <span>CHANGES,</span>
              <br />
              BE READY.
            </h1>

            <p className="hero-description">
              Take control of your emergency preparedness. Organize your supplies,
              understand your resource coverage, and know what to improve next.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" to="/register">
                Build Your Plan
                <Icon name="arrow" size={19} />
              </Link>
              <a className="button button-outline" href="#features">
                Explore Features
                <Icon name="arrowUp" size={18} />
              </a>
            </div>

            <div className="hero-trust">
              <div className="mini-shield">
                <Icon name="shield" size={16} />
              </div>
              <span>PREPARE WITH A PLAN. NOT A GUESS.</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="radar-ring radar-ring-one" aria-hidden="true" />
            <div className="radar-ring radar-ring-two" aria-hidden="true" />
            <BrandArtwork />
          </div>
        </div>

        <div className="page-container hero-bottom-bar">
          <span>01 — PREPARE</span>
          <span>02 — ASSESS</span>
          <span>03 — ADAPT</span>
          <span className="bar-end">
            BUILT FOR THE UNEXPECTED
            <Icon name="arrow" size={15} />
          </span>
        </div>
      </section>

      {/* Features section stays informational until the real application is ready. */}
      <section className="features-section" id="features">
        <div className="page-container">
          <div className="section-kicker">
            <span className="section-number">01 / CAPABILITIES</span>
            <span className="section-line" />
          </div>

          <div className="section-intro">
            <h2>
              A SMARTER WAY
              <br />
              <span>TO PREPARE.</span>
            </h2>
            <p>The core tools we're building for household preparedness and resource planning.</p>
          </div>

          <div className="features-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.tag}>
                <div className="feature-top">
                  <span className="feature-icon">
                    <Icon name={feature.icon} size={25} />
                  </span>
                  <span className="feature-tag">{feature.tag}</span>
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.body}</p>

                <div className="feature-bottom">
                  <span>PLANNED WORKFLOW</span>
                  <Icon name="arrowUp" size={17} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="process-section" id="how-it-works">
        <div className="page-container process-layout">
          <div>
            <div className="section-kicker">
              <span className="section-number">02 / HOW IT WORKS</span>
            </div>

            <h2>
              FROM UNCERTAINTY
              <br />
              TO <span>ACTION.</span>
            </h2>
            <p className="process-description">
              Start with the facts about your household. Your dashboard will help you
              turn inventory data into more informed planning decisions.
            </p>
            <Link className="text-link" to="/register">
              Create your account
              <Icon name="arrow" size={17} />
            </Link>
          </div>

          <div className="steps-list">
            <div className="step">
              <span className="step-num">01</span>
              <div>
                <h3>Set up your household</h3>
                <p>Save the details needed to plan for the people in your home.</p>
              </div>
              <Icon name="user" size={22} />
            </div>
            <div className="step">
              <span className="step-num">02</span>
              <div>
                <h3>Log your supplies</h3>
                <p>Add items, record quantities, and update your inventory as it changes.</p>
              </div>
              <Icon name="package" size={22} />
            </div>
            <div className="step">
              <span className="step-num">03</span>
              <div>
                <h3>Review your readiness</h3>
                <p>See estimated coverage, identify shortages, and prioritize next steps.</p>
              </div>
              <Icon name="chart" size={22} />
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="page-container">
          <div className="cta-panel">
            <div className="cta-mark">
              <Icon name="shield" size={30} />
            </div>
            <div>
              <span className="cta-label">MAKE A PLAN BEFORE YOU NEED ONE</span>
              <h2>READY TO TAKE CONTROL?</h2>
              <p>Your first step toward more organized preparedness starts here.</p>
            </div>
            <Link to="/register" className="button button-dark">
              Start Preparing
              <Icon name="arrow" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
