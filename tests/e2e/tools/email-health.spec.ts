import { expect, test } from '@playwright/test'
import emailHealthFixture from '../fixtures/email-health.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

// The shared fixture holds the base report. This spec adds the fields of the
// newer checks, so that it can assert them without a change to the fixture.
const detailedFixture = {
  result: {
    ...emailHealthFixture.result,
    spf: {
      ...emailHealthFixture.result.spf,
      issues: [
        {
          ...emailHealthFixture.result.spf.issues[0],
          observed: 'v=spf1 -all',
          impact: 'SPF fails for every server.',
          fix: 'Add one mechanism for each sender, such as include:_spf.example.net',
        },
      ],
      trace: {
        lookupCount: 3,
        lookupLimit: 10,
        voidLookupCount: 0,
        voidLookupLimit: 2,
        exceeded: false,
        loops: [],
        failed: [],
        nodes: [
          {
            domain: 'example.com',
            via: 'root',
            depth: 0,
            record: 'v=spf1 -all',
            status: 'ok',
            mechanisms: [],
          },
        ],
        ipv4: ['203.0.113.0/24'],
        ipv6: [],
        issues: [],
      },
    },
    dkim: {
      ...emailHealthFixture.result.dkim,
      tested: ['default'],
      skipped: [{ selector: 'google', provider: 'Google Workspace' }],
    },
    mtaSts: {
      kind: 'mta-sts',
      name: '_mta-sts.example.com',
      present: true,
      lookup: 'ok',
      raw: ['v=STSv1; id=20240101'],
      tags: [{ name: 'v', value: 'STSv1' }, { name: 'id', value: '20240101' }],
      issues: [{ level: 'ok', code: 'mta-sts-ok', message: 'MTA-STS record found.' }],
    },
    score: {
      points: 74,
      max: 100,
      percent: 74,
      grade: 'C',
      lines: [
        { label: 'SPF record', points: 10, max: 10, detail: 'The domain has one SPF record.' },
        { label: 'MTA-STS', points: 4, max: 4, detail: '_mta-sts.example.com has a record.' },
      ],
    },
  },
}

test.describe('Email Health Inspector tool', () => {
  test('inspects SPF, DKIM, DMARC, and MX records with mock response', { tag: '@smoke' }, async ({ page }) => {
    // Mock the DNS email-health endpoint
    await page.route('/api/network/dns', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emailHealthFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/email-health')

    const domainInput = page.locator('main').getByPlaceholder('example.com')
    await domainInput.fill('example.com')
    await page.locator('main').getByRole('button', { name: 'Inspect' }).click()

    // The fixture's SPF is `v=spf1 -all`, which authorizes no sender, so the
    // tool reports a warning rather than a clean result.
    await expect(
      page.locator('main').getByText('SPF has no authorizing mechanisms', { exact: false }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('main').getByText('DMARC record looks valid.')).toBeVisible()
    await expect(page.locator('main').getByText('mail.example.com')).toBeVisible()
  })

  test('shows the grade, the remediation details, the SPF trace, and the skipped selectors', async ({ page }) => {
    await page.route('/api/network/dns', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(detailedFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/email-health')

    const main = page.locator('main')
    await main.getByPlaceholder('example.com').fill('example.com')
    await main.getByRole('button', { name: 'Inspect' }).click()

    // NET-11: the grade and one scored line.
    await expect(main.getByText('Grade', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(main.getByText('The domain has one SPF record.')).toBeVisible()

    // NET-06: each finding shows the impact and one fix.
    await expect(main.getByText('Add one mechanism for each sender', { exact: false })).toBeVisible()

    // NET-08: the SPF trace shows the RFC 7208 lookup budget.
    await expect(main.getByText('3 / 10', { exact: true })).toBeVisible()

    // NET-09: the tool lists the common selectors that it did not check.
    await expect(main.getByText('google · Google Workspace')).toBeVisible()

    // NET-11: the MTA-STS record name.
    await expect(main.getByText('_mta-sts.example.com').first()).toBeVisible()
  })
})
