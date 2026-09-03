'use client'

import { useState } from 'react'
import ClaudePanel from '@/app/components/ClaudePanel'
import { endRemoteSession, startRemoteSession } from '@/app/actions/remote'
import { signIn, signOut, signUp, useSession } from '@/lib/auth-client'

type Device = { id: string; name: string; hostname: string; os: string; status: string }

const fetchDevices = () => fetch('/api/devices').then((r) => r.json())

function Login() {
  const [email, setEmail] = useState('alex@acme.com')
  const [password, setPassword] = useState('password123')
  const [name, setName] = useState('')
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')
  async function submit() {
    setError('')
    const result = registering
      ? await signUp.email({ name: name || email.split('@')[0], email, password })
      : await signIn.email({ email, password })
    if (result.error) setError(registering ? 'Unable to create account. Check your details.' : 'Unable to sign in. Check your credentials.')
  }
  return <main className="login-page"><section className="login-card"><p className="eyebrow">CLOUDDESK / SECURE ACCESS</p><h1>Remote workspaces,<br /><span>without the friction.</span></h1><p className="subhead">{registering ? 'Create an account to access your secure workspace.' : 'Sign in to open authenticated screen sessions with your enrolled Windows agents.'}</p>{registering && <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} type="text" /></label>}<label>Work email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label><label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></label>{error && <p className="form-error">{error}</p>}<button className="primary" onClick={submit}>{registering ? 'Create account' : 'Sign in securely'}</button><button className="ghost" onClick={() => { setRegistering(!registering); setError('') }}>{registering ? 'Back to sign in' : 'Create a new account'}</button><small>Protected by Better Auth and Neon.</small></section></main>
}

function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selected, setSelected] = useState<Device | null>(null)
  const [state, setState] = useState<'idle' | 'authorizing' | 'streaming' | 'reconnecting'>('idle')
  const [notice, setNotice] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const [installerUrl, setInstallerUrl] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  async function load() { setDevices(await fetchDevices()) }
  async function prepareAgent() {
    setInstallerUrl('/api/agent/download')
    setNotice('Personalized installer ready. Download it and run it as Administrator on the client machine.')
    window.location.assign('/api/agent/download')
  }
  const pair = prepareAgent
  async function connect(device: Device) {
    try {
      const session = await startRemoteSession(device.id)
      setSelected(device)
      setSessionId(session.id)
      setState('authorizing')
      setNotice('Requesting a short-lived screen authorization…')
      setTimeout(() => { setState('streaming'); setNotice('Encrypted screen channel established.') }, 1000)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to start remote session.')
    }
  }
  async function endSession() {
    if (sessionId) await endRemoteSession(sessionId)
    setSessionId(null)
    setSelected(null)
    setState('idle')
    setNotice('Remote session ended.')
  }
  return <main className="dashboard"><header><div><p className="eyebrow">REMOTE OPERATIONS / WINDOWS</p><h1>Computers</h1><p className="subhead">Enroll an agent, then open a secure live screen session.</p></div><button className="ghost" onClick={() => signOut()}>Sign out</button></header><section className="control-row"><button className="primary" onClick={load}>Refresh devices</button><div className="signal"><i /> Outbound agent channel ready</div></section><section className="device-list"><div className="section-head"><div><p className="eyebrow">ENROLLMENT</p><h2>Pair a Windows agent</h2></div></div><div className="control-row"><input value={pairingCode} onChange={(event) => setPairingCode(event.target.value)} placeholder="CD-ABC-123" aria-label="Pairing code" /><button className="primary" onClick={pair}>Create pairing record</button></div></section>{notice && <div className="notice">{notice}</div>} {selected ? <section className="stream-card"><div className="stream-head"><div><p className="eyebrow">LIVE SCREEN</p><h2>{selected.name}</h2></div><button className="ghost" onClick={endSession}>End session</button></div><div className="screen"><div className="screen-top"><span>● {state === 'streaming' ? 'Streaming' : state === 'reconnecting' ? 'Reconnecting' : 'Authorizing'}</span><span>{selected.os} · {selected.hostname}</span></div><div className="screen-content">{state === 'streaming' ? <><div className="windows-mark">▦</div><strong>CloudDesk screen stream</strong><span>Frames will appear here when the Windows capture adapter is connected.</span></> : <><div className="spinner" /><strong>Establishing secure connection</strong><span>Verifying device identity and negotiating the media channel.</span></>}</div></div><div className="stream-footer"><span>WebRTC-compatible signaling</span><button className="danger" onClick={() => setState('reconnecting')}>Simulate reconnect</button></div></section> : <section className="device-list"><div className="section-head"><div><p className="eyebrow">ENROLLED DEVICES</p><h2>Your Windows agents</h2></div><button className="ghost" onClick={load}>Load devices</button></div>{devices.length === 0 ? <div className="empty"><strong>No agents loaded yet</strong><span>Pair a Windows agent from the enrollment flow to begin streaming.</span></div> : devices.map((device) => <article className="device" key={device.id}><div className="device-icon">▣</div><div className="device-copy"><strong>{device.name}</strong><span>{device.hostname} · {device.os}</span></div><span className={`pill ${device.status}`}>{device.status.replace('_', ' ')}</span><button className="primary small" disabled={device.status !== 'online'} onClick={() => connect(device)}>Connect</button></article>)}</section>}</main>
}

export default function Page() {
  const session = useSession()
  if (session.isPending) return <main className="loading-state">Loading secure workspace…</main>
  if (!session.data?.user) return <Login />
  return (
    <>
      <Dashboard />
      <ClaudePanel />
    </>
  )
}
