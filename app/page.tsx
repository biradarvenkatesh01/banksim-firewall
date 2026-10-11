export default function Home() {
  return (
    <main className="placeholder">
      <h1>BankSim — Blue-Team AI Firewall</h1>
      <p>
        The firewall engine and API are live. The interactive console arrives in a later build.
      </p>
      <ul>
        <li>
          <code>POST /api/analyze</code> — analyze a message (and optional memo)
        </li>
        <li>
          <code>GET /api/account</code> — mock account state
        </li>
        <li>
          <code>POST /api/account/reset</code> — reset the mock ledger
        </li>
        <li>
          <code>GET /api/health</code> — engine mode, thresholds and limits
        </li>
      </ul>
    </main>
  );
}
