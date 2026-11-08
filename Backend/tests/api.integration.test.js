// Integration tests for the security / accounting rules in the assignment (Part H).
//
// Prerequisites (see docs/TESTING.md):
//   1. MongoDB Atlas / replica set, and `DEMO_MODE=true npm run seed:demo`
//   2. Server running with higher test rate limits, e.g.
//        REDEMPTION_CREATE_LIMIT=200 REDEMPTION_QUOTE_LIMIT=200 npm start
//   3. API_URL=http://localhost:5000   (default)  then:  npm run test:integration
//
// The tests use the DEMO accounts only and RESET nothing themselves: re-run
// `npm run seed:demo` before each full run for a clean, repeatable state.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const API = (process.env.API_URL || 'http://localhost:5000').replace(/\/+$/, '')

const ADMIN = {
  email: process.env.DEMO_ADMIN_EMAIL || 'demo.admin@veloop.demo',
  password: process.env.DEMO_ADMIN_PASSWORD || 'DemoAdmin@2026'
}
const USER = {
  email: process.env.DEMO_USER_EMAIL || 'demo.user@veloop.demo',
  password: process.env.DEMO_USER_PASSWORD || 'DemoUser@2026'
}
const LOWBAL = {
  email: process.env.DEMO_LOWBAL_EMAIL || 'demo.lowbalance@veloop.demo',
  password: process.env.DEMO_USER_PASSWORD || 'DemoUser@2026'
}

const call = async (method, path, { token, body, headers } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  let data = null
  try { data = await res.json() } catch { /* non-JSON */ }
  return { status: res.status, data }
}

const key = () => `test-${crypto.randomUUID()}`
const ctx = {}

const wallet = async (token) => (await call('GET', '/api/wallet', { token })).data.wallet
const findOption = (method, rewardValue) => {
  const m = ctx.methods.find(x => x.key === method)
  return { method: m, option: m.rewardOptions.find(o => o.rewardValue === rewardValue) }
}

test('setup: health, logins, payout config', async () => {
  const health = await call('GET', '/api/health')
  assert.equal(health.status, 200)

  const u = await call('POST', '/api/auth/login', { body: USER })
  assert.equal(u.status, 200, 'demo user login (run `DEMO_MODE=true npm run seed:demo` first)')
  ctx.user = u.data.token
  ctx.userId = u.data.user?._id || u.data.user?.id

  const l = await call('POST', '/api/auth/login', { body: LOWBAL })
  assert.equal(l.status, 200)
  ctx.low = l.data.token
  ctx.lowId = l.data.user?._id || l.data.user?.id

  const a = await call('POST', '/api/admin/login', { body: ADMIN })
  assert.equal(a.status, 200, 'demo admin login')
  ctx.admin = a.data.token

  const m = await call('GET', '/api/payouts/methods', { token: ctx.user })
  assert.equal(m.status, 200)
  ctx.methods = m.data.methods
  for (const k of ['upi', 'amazon', 'googlePlay']) {
    assert.ok(ctx.methods.find(x => x.key === k)?.rewardOptions.length > 0, `reward options exist for ${k}`)
  }
})

test('auth: unauthenticated / forged / non-admin requests are rejected', async () => {
  assert.equal((await call('GET', '/api/wallet')).status, 401)
  assert.equal((await call('POST', '/api/redemptions', { body: {} })).status, 401)
  assert.equal((await call('GET', '/api/wallet', { token: 'not.a.jwt' })).status, 401)
  assert.equal((await call('GET', '/api/admin/redemptions')).status, 401)
  // normal user token on admin APIs
  for (const path of ['/api/admin/redemptions', '/api/admin/users', '/api/admin/transactions', '/api/admin/audit-logs', '/api/admin/payouts/methods']) {
    const r = await call('GET', path, { token: ctx.user })
    assert.ok([401, 403].includes(r.status), `${path} must reject user token, got ${r.status}`)
  }
  // client-supplied role is ignored
  const r = await call('GET', '/api/admin/users', { token: ctx.user, headers: { 'X-Role': 'super_admin' } })
  assert.ok([401, 403].includes(r.status))
  // user cannot approve / change config
  const { option } = findOption('upi', 10)
  assert.ok([401, 403].includes((await call('PATCH', `/api/admin/payouts/reward-options/${option._id}`, { token: ctx.user, body: { requiredVEs: 1 } })).status))
  assert.ok([401, 403].includes((await call('PATCH', `/api/admin/redemptions/${option._id}/status`, { token: ctx.user, body: { status: 'APPROVED' } })).status))
})

test('admin login: wrong password rejected', async () => {
  const r = await call('POST', '/api/admin/login', { body: { email: ADMIN.email, password: 'definitely-wrong' } })
  assert.equal(r.status, 401)
})

test('validation: invalid UPI and invalid email are rejected, nothing deducted', async () => {
  const before = (await wallet(ctx.user)).availableBalance
  const upi = findOption('upi', 10).option
  const amz = findOption('amazon', 25).option

  const bad1 = await call('POST', '/api/redemptions', { token: ctx.user, body: { rewardOptionId: upi._id, upiId: 'not-a-upi', idempotencyKey: key() } })
  assert.equal(bad1.status, 400)
  const bad2 = await call('POST', '/api/redemptions', { token: ctx.user, body: { rewardOptionId: amz._id, email: 'nope', idempotencyKey: key() } })
  assert.equal(bad2.status, 400)
  const bad3 = await call('POST', '/api/redemptions', { token: ctx.user, body: { rewardOptionId: upi._id, upiId: 'a@upi' } })
  assert.equal(bad3.status, 400, 'idempotency key required')

  assert.equal((await wallet(ctx.user)).availableBalance, before)
})

test('manipulation: client cost / status / userId fields are ignored', async () => {
  const before = (await wallet(ctx.user)).availableBalance
  const { option } = findOption('upi', 10)
  const r = await call('POST', '/api/redemptions', {
    token: ctx.user,
    body: {
      rewardOptionId: option._id, upiId: 'tester@upi', idempotencyKey: key(),
      rewardAmount: 1000, requiredVEs: 1, status: 'approved', userId: ctx.lowId, balanceAfter: 999999, isEligible: true
    }
  })
  assert.equal(r.status, 201)
  assert.equal(r.data.redemption.requiredVEs, option.requiredVEs, 'server price used')
  assert.equal(r.data.redemption.status, 'PENDING', 'client cannot pick status')
  assert.equal(String(r.data.redemption.user), String(ctx.userId), 'owner is the authenticated user')
  assert.equal((await wallet(ctx.user)).availableBalance, before - option.requiredVEs)
  ctx.redemptionA = r.data.redemption
})

test('ownership: another user cannot read this redemption', async () => {
  const r = await call('GET', `/api/redemptions/my/${ctx.redemptionA._id}`, { token: ctx.low })
  assert.equal(r.status, 404)
  const mine = await call('GET', `/api/redemptions/my/${ctx.redemptionA._id}`, { token: ctx.user })
  assert.equal(mine.status, 200)
})

test('idempotency: parallel retries of one key create ONE request and ONE deduction', async () => {
  const before = (await wallet(ctx.user)).availableBalance
  const { option } = findOption('upi', 10)
  const k = key()
  const body = { rewardOptionId: option._id, upiId: 'dup@upi', idempotencyKey: k }
  const results = await Promise.all([1, 2, 3, 4].map(() => call('POST', '/api/redemptions', { token: ctx.user, body })))
  const ok = results.filter(r => [200, 201].includes(r.status))
  assert.ok(ok.length >= 1)
  assert.equal(new Set(ok.map(r => r.data.redemption._id)).size, 1, 'single redemption id')
  assert.equal((await wallet(ctx.user)).availableBalance, before - option.requiredVEs, 'deducted exactly once')
  ctx.redemptionB = ok[0].data.redemption

  // same key, different payload => rejected
  const reuse = await call('POST', '/api/redemptions', { token: ctx.user, body: { ...body, upiId: 'other@upi' } })
  assert.equal(reuse.status, 409)
})

test('concurrency: two simultaneous requests that exceed the balance -> only one succeeds, never negative', async () => {
  // give the low-balance user exactly enough for ONE ₹10 UPI reward (500 + 2500 = 3000 vs 2400 each)
  const credit = await call('POST', '/api/admin/wallet/credit', {
    token: ctx.admin,
    body: { userId: ctx.lowId, amount: 2500, description: 'Integration test top-up', idempotencyKey: key() }
  })
  assert.equal(credit.status, 200, JSON.stringify(credit.data))
  const start = (await wallet(ctx.low)).availableBalance
  const { option } = findOption('upi', 10)

  const results = await Promise.all([0, 1].map(i =>
    call('POST', '/api/redemptions', { token: ctx.low, body: { rewardOptionId: option._id, upiId: `race${i}@upi`, idempotencyKey: key() } })
  ))
  const created = results.filter(r => r.status === 201)
  const rejected = results.filter(r => r.status === 400)
  assert.equal(created.length, 1, JSON.stringify(results.map(r => r.status)))
  assert.equal(rejected.length, 1)
  const end = (await wallet(ctx.low)).availableBalance
  assert.equal(end, start - option.requiredVEs)
  assert.ok(end >= 0)
})

test('insufficient balance is rejected with a clear message', async () => {
  const { option } = findOption('amazon', 50)
  const r = await call('POST', '/api/redemptions', { token: ctx.low, body: { rewardOptionId: option._id, email: 'low@example.com', idempotencyKey: key() } })
  assert.equal(r.status, 400)
  assert.match(r.data.message, /insufficient/i)
  const q = await call('POST', '/api/redemptions/quote', { token: ctx.low, body: { rewardOptionId: option._id } })
  assert.equal(q.data.quote.eligible, false)
  assert.ok(q.data.quote.shortfall > 0)
})

test('admin lifecycle: invalid / repeated transitions rejected; reject refunds exactly once', async () => {
  const id = ctx.redemptionA._id
  const patch = (status, extra = {}) => call('PATCH', `/api/admin/redemptions/${id}/status`, { token: ctx.admin, body: { status, ...extra } })

  assert.equal((await patch('COMPLETED', { providerReference: 'X1' })).status, 400, 'PENDING -> COMPLETED not allowed')
  assert.equal((await patch('REJECTED')).status, 400, 'reason required')

  const before = (await wallet(ctx.user)).availableBalance
  const rej = await patch('REJECTED', { adminNote: 'Test rejection for refund check' })
  assert.equal(rej.status, 200)
  assert.equal((await wallet(ctx.user)).availableBalance, before + ctx.redemptionA.requiredVEs)

  const again = await patch('REJECTED', { adminNote: 'Repeat rejection' })
  assert.equal(again.status, 400, 'repeat transition rejected')
  assert.equal((await wallet(ctx.user)).availableBalance, before + ctx.redemptionA.requiredVEs, 'no double refund')

  // approve -> complete path on the other request
  const idB = ctx.redemptionB._id
  const p = (status, extra = {}) => call('PATCH', `/api/admin/redemptions/${idB}/status`, { token: ctx.admin, body: { status, ...extra } })
  assert.equal((await p('APPROVED')).status, 200)
  assert.equal((await p('APPROVED')).status, 400, 'repeat approve rejected')
  assert.equal((await p('COMPLETED')).status, 400, 'provider reference required')
  assert.equal((await p('COMPLETED', { providerReference: 'DEMO-REF-001' })).status, 200)
  assert.equal((await p('REJECTED', { adminNote: 'too late' })).status, 400, 'completed is final')
})

test('user history reflects real backend status', async () => {
  const h = await call('GET', '/api/redemptions/my', { token: ctx.user })
  assert.equal(h.status, 200)
  const a = h.data.redemptions.find(r => r._id === ctx.redemptionA._id)
  const b = h.data.redemptions.find(r => r._id === ctx.redemptionB._id)
  assert.equal(a.status, 'REJECTED')
  assert.equal(b.status, 'COMPLETED')
  assert.equal(a.payoutDetails, undefined, 'destination not exposed in list')
})

test('admin config: changing cost is enforced; stale cost -> CONFIG_CHANGED; snapshot keeps old cost', async () => {
  const { option } = findOption('upi', 50)
  const oldCost = option.requiredVEs
  const newCost = oldCost + 100
  const patch = await call('PATCH', `/api/admin/payouts/reward-options/${option._id}`, {
    token: ctx.admin, body: { requiredVEs: newCost, changeReason: 'Integration test cost change' }
  })
  assert.equal(patch.status, 200, JSON.stringify(patch.data))

  try {
    const stale = await call('POST', '/api/redemptions', {
      token: ctx.user, body: { rewardOptionId: option._id, upiId: 'cfg@upi', idempotencyKey: key(), expectedRequiredVEs: oldCost }
    })
    assert.equal(stale.status, 409)
    assert.equal(stale.data.code, 'CONFIG_CHANGED')

    const before = (await wallet(ctx.user)).availableBalance
    const fresh = await call('POST', '/api/redemptions', {
      token: ctx.user, body: { rewardOptionId: option._id, upiId: 'cfg@upi', idempotencyKey: key(), expectedRequiredVEs: newCost }
    })
    assert.equal(fresh.status, 201)
    assert.equal(fresh.data.redemption.requiredVEs, newCost)
    assert.equal((await wallet(ctx.user)).availableBalance, before - newCost)
    assert.equal(fresh.data.redemption.rewardSnapshot.requiredVEs, newCost)
  } finally {
    await call('PATCH', `/api/admin/payouts/reward-options/${option._id}`, {
      token: ctx.admin, body: { requiredVEs: oldCost, changeReason: 'Integration test restore' }
    })
  }
})

test('admin config: invalid values rejected', async () => {
  const { option } = findOption('upi', 10)
  for (const requiredVEs of [-5, 0, 1.5, 'abc']) {
    const r = await call('PATCH', `/api/admin/payouts/reward-options/${option._id}`, {
      token: ctx.admin, body: { requiredVEs, changeReason: 'invalid value test' }
    })
    assert.equal(r.status, 400, `requiredVEs=${requiredVEs}`)
  }
})

test('disabled payout method blocks new redemptions at the API', async () => {
  const { method, option } = findOption('googlePlay', 25)
  const off = await call('PATCH', `/api/admin/payouts/methods/${method._id}`, {
    token: ctx.admin, body: { isEnabled: false, changeReason: 'Integration test disable' }
  })
  assert.equal(off.status, 200)
  try {
    const r = await call('POST', '/api/redemptions', {
      token: ctx.user, body: { rewardOptionId: option._id, email: 'gp@example.com', idempotencyKey: key() }
    })
    assert.ok([400, 404].includes(r.status), `got ${r.status}`)
  } finally {
    await call('PATCH', `/api/admin/payouts/methods/${method._id}`, {
      token: ctx.admin, body: { isEnabled: true, changeReason: 'Integration test re-enable' }
    })
  }
})

test('accounting: ledger rows exist for redemption and refund; audit log has admin actions', async () => {
  const tx = await call('GET', '/api/wallet/transactions', { token: ctx.user })
  assert.equal(tx.status, 200)
  const list = tx.data.transactions || []
  assert.ok(list.some(t => t.type === 'REDEEM'))
  assert.ok(list.some(t => t.type === 'REFUND'))

  const audit = await call('GET', '/api/admin/audit-logs?limit=50', { token: ctx.admin })
  assert.equal(audit.status, 200)
  assert.ok((audit.data.logs || audit.data.auditLogs || []).length > 0)
})
