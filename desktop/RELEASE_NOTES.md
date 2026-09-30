## Starlane 0.1.0 Pilot for Windows

This is the first pilot build of Starlane for Windows. It is for selected businesses working with the Starlane team. It is not a general-availability release.

### Install
1. Download `Starlane-Setup-x64.exe` below, or use the Download button on the Starlane website.
2. Run it. It installs for your Windows user only, and no administrator rights are needed.
3. Open Starlane from the Start Menu and sign in.
4. Connect your business. On the computer that runs TallyPrime, choose TallyPrime. Otherwise, upload a CSV or Excel export.
5. Let Starlane scan your books.

`Starlane-x64.msi` is for IT-managed installs. `SHA256SUMS.txt` and `starlane-release.json` list each file's SHA-256.

### What's in it
- The Bridge, Scan, Watch, Missions, Simulate, Memory and Prepared, all from your own books.
- A Tally connection built in. It finds TallyPrime on this computer (ports 9000 to 9005) and only reads from it. It keeps syncing from the tray when the window is closed.
- Approvals with evidence. Actions wait for a person, and external messages are off.
- Settings › Diagnostics shows the app version, the service connection, sign-in, the Bridge, connectors and last sync. It also has **Copy diagnostics** and **Open logs** for support.

### Supported connectors
- TallyPrime on the same Windows computer, read-only.
- CSV and Excel invoice exports.
- Public data feeds (ECB exchange rates, USGS earthquakes).

Cloud accounting apps (QuickBooks, Zoho Books, Xero) are not available yet.

### Supported actions
- Prepare a reminder, a mission or a follow-up for your approval.
- Shadow runs show what would happen without sending anything.
- Starlane never marks a payment received, never changes an amount and never deletes records.

### Pilot warnings
- **The installer is not code-signed yet**, unless the release says otherwise. Windows SmartScreen may show "Windows protected your PC". To continue, choose **More info › Run anyway**. Check the SHA-256 first if you want to be sure the file is genuine.
- **The app cannot update itself** unless the release includes `latest.json`. To upgrade, download and run the newer installer over the old one. Your sign-in and Tally connection are kept.
- Windows 10 or 11, 64-bit only. There is no macOS or Linux app.
- The app needs internet access to reach the Starlane service. When it is offline, it says so and shows the last loaded data, marked as not live.
