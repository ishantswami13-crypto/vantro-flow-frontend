// How the books reach Starlane, drawn as the actual setup: the office PC that
// runs TallyPrime, the small read-only bridge program beside it, and Starlane
// on the other side, with files and public feeds as the other ways in. Rows
// visibly travel one way only. Demo company figures; decorative, since the
// connection cards below say all of this in words.

const VOUCHERS = [
  ["Sales", "S/152", "Joshi Tiles", "23,500"],
  ["Receipt", "R/88", "Mehta Hardware", "40,000"],
  ["Sales", "S/149", "Rao Steel", "74,000"],
  ["Purchase", "P/61", "Metro Wholesale", "1,12,000"],
  ["Sales", "S/147", "Bansal Paints", "52,000"],
];

export function BridgeDiagram() {
  return (
    <div className="slb" aria-hidden>
      <div className="slb-pc">
        <div className="slb-monitor">
          <p className="slb-win-top"><span>TallyPrime</span><em>Day Book · Arora Hardware Traders</em></p>
          <table className="slb-table">
            <tbody>
              {VOUCHERS.map((v) => (
                <tr key={v[1]}><td>{v[0]}</td><td className="sl-num">{v[1]}</td><td>{v[2]}</td><td className="sl-num">{v[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="slb-stand" />
        <p className="slb-label">Accounting software on your own computer, TallyPrime here</p>
      </div>

      <div className="slb-pipe">
        <div className="slb-bridge">
          <span className="slb-bridge-dot" />
          <span><b>Starlane bridge</b><em>read-only · paired by one-time code</em></span>
        </div>
        <div className="slb-lane">
          <i /><i /><i /><i />
        </div>
        <div className="slb-side">
          <span className="slb-chip">CSV / Excel exports</span>
          <span className="slb-chip">ECB rates · USGS feed</span>
        </div>
      </div>

      <div className="slb-star">
        <p className="slb-win-top"><span>Starlane</span><em>Sources</em></p>
        <ul className="slb-src">
          <li><i className="ok" /><span>TallyPrime via bridge</span><em>synced 07:52</em></li>
          <li><i className="ok" /><span>Invoices.xlsx</span><em>imported once</em></li>
          <li><i className="ok" /><span>Public feeds</span><em>daily</em></li>
          <li><i /><span>Zoho Books</span><em>not built yet</em></li>
        </ul>
        <div className="slb-stat">
          <div><p className="sl-num">0</p><span>writes to your books</span></div>
          <div><p>Any time</p><span>revoke it from Starlane</span></div>
        </div>
      </div>
    </div>
  );
}
