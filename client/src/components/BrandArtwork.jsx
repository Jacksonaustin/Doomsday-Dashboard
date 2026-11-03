import Icon from './Icon.jsx'

// Pure decoration: never render invented inventory or preparedness statistics here.
export default function BrandArtwork() {
  return (
    <div className="brand-artwork" aria-hidden="true">
      <div className="artwork-grid" />
      <div className="artwork-ring artwork-ring-outer" />
      <div className="artwork-ring artwork-ring-inner" />
      <div className="artwork-crosshair artwork-crosshair-top" />
      <div className="artwork-crosshair artwork-crosshair-bottom" />

      <div className="artwork-center">
        <div className="artwork-emblem">
          <Icon name="shield" size={94} />
        </div>
        <div className="artwork-title">
          DOOMSDAY <span>DASHBOARD</span>
        </div>
        <div className="artwork-tagline">PREPARE. TRACK. ADAPT.</div>
      </div>

      <span className="artwork-edge artwork-edge-top" />
      <span className="artwork-edge artwork-edge-bottom" />
    </div>
  )
}
