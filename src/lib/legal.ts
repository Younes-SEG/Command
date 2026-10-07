export const policyUpdated = 'October 7, 2026';
export const calendarNoticeVersion = '2026-10-07';

export const legalDocuments = {
  privacy: {
    title: 'Privacy policy',
    introduction:
      'Command has a local edition and a hosted edition with private accounts. This policy describes where each edition processes your information, including optional syllabus reading.',
    sections: [
      {
        title: 'Your workspace and account',
        paragraphs: [
          'Your courses, assessments, grades, tasks, subtasks, notes, calendar entries, semesters and preferences are stored in PostgreSQL. In the downloaded local edition, that database is on your computer and no account is required. In the hosted edition, Vercel processes application requests and Neon stores workspace data. Server-side ownership checks restrict workspace access to the signed-in account. This does not prevent access by authorized service operators or infrastructure providers.',
          'Hosted sign-in uses Neon Auth to process your email, optional name, password authentication and sessions. Verification and password-reset emails are transactional, not marketing. Command does not store plaintext passwords in its workspace tables. A verified account identifier links your workspace to your login. No date of birth, student ID, payment details or marketing profile is required. Hosting and authentication providers may retain operational and security logs under their own policies; regions, backup retention and operator contact details must be finalized for the public release.',
        ],
      },
      {
        title: 'Calendar connections',
        paragraphs: [
          'Previewing a subscription sends the link to the Command server running your edition, which requests the calendar from its provider. For the hosted edition this means Vercel processes the private link and Neon stores it after connection. The calendar provider receives the request and may log the server network address and feed credential. Preview data is not saved to the database unless you choose Connect and import.',
          'Connecting saves the private feed URL, selected dates and time zone, imported entries, sync status and the date/version of the connection notice you accepted. Local servers check approximately every 15 minutes while running. Hosted connections are checked when you use the app, at most once per 15 minutes automatically, or when you request a manual sync. Feed links can grant calendar access; do not publish them or put them in a shared repository.',
          'Disconnect stops checks but retains the link for reconnection. Forget link removes the saved connection and sync mapping while keeping imported academic entries. You can delete those entries individually or erase your workspace. Reimporting a forgotten connection can create duplicates.',
        ],
      },
      {
        title: 'Syllabus imports',
        paragraphs: [
          'Choosing a syllabus file starts AI reading automatically after you select a course. Uploading a PDF/TXT or submitting pasted text sends its content and the selected course code/name and semester dates to Command’s hosted reading service and then OpenAI through the application server. Your other courses, saved grades, notes and calendar credentials are not included. The upload screen explains this transfer before you choose a file. Users do not configure an AI key or account. The service operator manages the provider connection and its costs; request allowances apply.',
          'Original files and previews are processed in memory and are not saved by Command’s reader. Its usage database stores aggregate request counts and daily rotating, keyed hashes of network addresses or prefixes to enforce allowances. Daily identifiers are pruned hourly after the next UTC day begins; aggregate monthly counters expire the next month. Hosting logs and disk snapshots may have separate retention, which must be documented for the chosen host before public release. Requests use inline PDF data rather than persistent file uploads and disable response storage. Provider retention rules still apply: OpenAI may retain API content for abuse monitoring and other permitted purposes. Disabling response storage does not guarantee zero retention. Review the provider’s current data controls at developers.openai.com/api/docs/guides/your-data before submitting sensitive documents.',
          'Saving reviewed assessments stores their dates and weights in your workspace; new assessments also keep the displayed source excerpt and page reference in their notes. Existing matched assessments retain their original notes and grades. Discarding the preview does not save academic records, but cannot undo a request already sent to the provider. Erasing Command’s workspace does not erase provider-held copies, hosting logs or temporary service usage counters.',
        ],
      },
      {
        title: 'Tracking, cookies and third parties',
        paragraphs: [
          'Command has no advertising, analytics, session replay, marketing SDKs, tracking cookies, or sale of workspace data. It does not send marketing email. The study buddy’s mouse reactions are calculated in browser memory; pointer positions are not stored or sent anywhere.',
          'Application code, icons and graphics are bundled locally. Fonts use your device’s installed system fonts. Calendar connections contact their providers; syllabus imports contact Command’s hosted reader and OpenAI when you upload or submit text. Checking reader availability also contacts the hosted service, without sending syllabus content. Installing or updating the software through a package registry or download host is a separate network activity governed by that service.',
        ],
      },
      {
        title: 'Access, correction and deletion',
        paragraphs: [
          'Edit individual entries in Command. Settings → Your data lets you download a JSON copy and permanently erase the application’s workspace data. The export excludes private subscription URLs but includes your academic information and preferences; store it privately. It is a data copy, not an automatic restore format.',
          'Erasure deletes workspace records, saved feed links and preferences from the active application database and stops syncing. It does not erase files you downloaded, operating-system backups, database logs/snapshots, provider-held calendars, or copies made by other software. Those copies must be removed through the systems that hold them. Command has no automatic backup-retention service.',
          'Settings → Your data erases only the active workspace. In the hosted edition this does not delete your Neon Auth login, authentication records or provider backups. A verified account-deletion and support process, with a public contact, must be completed before broad public release. No support request form is active now.',
        ],
      },
      {
        title: 'Retention and safeguards',
        paragraphs: [
          'Workspace records remain until you delete them. There is no scheduled expiry. Application error logs omit raw database errors and feed credentials. Database, operating-system, proxy or calendar-provider logs are outside Command’s deletion function.',
          'The local edition binds to your computer and rejects public workspace requests. The hosted edition requires a verified session and scopes data reads, writes, exports and erasure to that account. Protect your device and sign out on shared computers. Hosting credentials and database administration grant access beyond an ordinary user account.',
        ],
      },
      {
        title: 'Audience and future changes',
        paragraphs: [
          'Command is designed for postsecondary study and general personal planning, not a child-directed service. It does not collect age or parental-consent records. A future child-directed or hosted version would need a separate privacy and age-consent assessment before collecting children’s information.',
          'The planned publisher jurisdiction is Ontario, Canada. Operator identity and a privacy/security contact have not been designated for public release yet. This notice must be reviewed and those details supplied before public distribution. Material changes to data collection or optional services need an updated notice and any consent required for that change.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    introduction:
      'These terms describe the current preview of Command. Public-release operator and contact details are still pending.',
    sections: [
      {
        title: 'Using Command',
        paragraphs: [
          'Command helps organize personal study plans. You may run the copy supplied to you on your own device for lawful personal use. Third-party software remains subject to its own licences, listed in Credits. These terms do not grant ownership of third-party materials or override their licences.',
          'You keep ownership of your notes and academic information. Only enter or connect information you are authorized to use. Do not use the application to obtain someone else’s calendar, bypass an institution’s access controls, or violate another person’s privacy.',
        ],
      },
      {
        title: 'Dates and grade estimates',
        paragraphs: [
          'Calendar feeds can omit work, delay updates or change their date range. Grades and weights are not imported by the calendar feed. AI syllabus suggestions can omit assessments or misread dates, source references and grading rules. Review them before saving and verify important dates, submissions and results with your institution. Grade calculations and target estimates are planning aids, not official academic records or guarantees.',
        ],
      },
      {
        title: 'Your installation and copies',
        paragraphs: [
          'Protect your account, computer and database, and keep private backups if you need them. A JSON export is a readable data copy; an automatic restore tool is not included. Deleting your workspace cannot remove independently created backups or provider records.',
          'The local edition has no accounts or hosted recovery. The hosted edition stores your workspace online and uses Neon Auth accounts. You can disconnect feeds, export or erase your workspace and sign out. Local calendar refreshes stop with the server; hosted automatic refreshes depend on using the application.',
        ],
      },
      {
        title: 'Charges and refunds',
        paragraphs: [
          'Command has no checkout, paid subscription, trial conversion or in-app fees. The shared syllabus reader is managed and funded by the operator; users are not asked to provide an AI account or payment details. Request allowances and service availability limits apply. Independent internet costs are governed by your provider’s agreement. No refund transaction exists in Command.',
          'A paid release would need clear pricing, taxes, cancellation and refund terms before a purchase is offered. Nothing here waives any non-waivable consumer right.',
        ],
      },
      {
        title: 'Availability and changes',
        paragraphs: [
          'Software can contain errors. There is no promise of uninterrupted operation, automatic updates or a particular academic outcome. Security fixes and changes should be accompanied by release notes and updated notices when appropriate.',
          'Ontario, Canada is the planned publisher jurisdiction. These preview terms do not impose arbitration, waive class proceedings, or remove consumer protections that apply where you live. Operator identity, contact information and final release terms must be completed before public distribution.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies and device storage',
    introduction:
      'Command does not use advertising or analytics cookies. Hosted accounts use necessary authentication cookies to keep you signed in.',
    sections: [
      {
        title: 'What the app uses',
        paragraphs: [
          'Academic data and preferences are stored in the database for your edition. Hosted authentication uses secure, HTTP-only session cookies and signed session-cache cookies, with SameSite protections. The authentication library may use browser storage and tab messages to coordinate session changes. These support sign-in rather than advertising. Temporary workspace state, previews and mouse positions live in browser memory.',
          'Your browser may cache application files as part of ordinary browsing. Workspace responses are marked private and no-store. Calendar providers are contacted by the application server when you preview or connect a feed.',
        ],
      },
      {
        title: 'Why there is no cookie banner',
        paragraphs: [
          'The current app has no optional analytics or advertising storage to accept or reject. Hosted authentication storage supports the sign-in feature. If optional tracking is introduced, its purpose and controls must be disclosed before it runs.',
        ],
      },
    ],
  },
  accessibility: {
    title: 'Accessibility',
    introduction:
      'Command aims to be usable with a keyboard, readable in either theme, and comfortable with reduced motion. This is an implementation statement, not a certification of full WCAG conformance.',
    sections: [
      {
        title: 'Keyboard and forms',
        paragraphs: [
          'Use Tab and Shift+Tab to move through controls, Enter or Space to activate them, Escape to close dialogs, and Ctrl+K or Cmd+K to open the command palette. Dialogs keep keyboard focus within their controls. A skip link goes directly to the page content.',
          'Forms have visible labels. Required inputs are identified; optional fields can be left empty. Buttons and selected states are not distinguished only by colour.',
        ],
      },
      {
        title: 'Visuals and motion',
        paragraphs: [
          'Light and dark themes use contrast-tested text and control colours. Decorative illustrations are hidden from assistive technology, while the study buddy has a concise accessible name. You can select Off or disable Gentle movement in Appearance.',
          'Device reduced-motion preferences disable card entrances, buddy movement and decorative animation. The buddy does not intercept clicks or make sounds. Calendar information is also available in the selected-day agenda.',
        ],
      },
      {
        title: 'Known limits and feedback',
        paragraphs: [
          'Automated checks cannot establish complete accessibility. Calendar layouts can require horizontal scrolling on small screens. Screen-reader combinations, high magnification and additional assistive technologies still need manual testing before public release.',
          'An accessibility and security reporting contact will be added with the public release. No feedback form collects personal information in this preview.',
        ],
      },
    ],
  },
  about: {
    title: 'About this edition',
    introduction:
      'Command is a study planner available as a local installation or a hosted application with private user workspaces. Optional syllabus imports use a separate hosted reading service.',
    sections: [
      {
        title: 'Publisher details',
        paragraphs: [
          'Planned jurisdiction: Ontario, Canada. Operator/business name, public contact email and any legally required business address or registration details are intentionally not supplied yet. Public distribution is pending those details and a final policy review. No business identity or contact address has been invented.',
        ],
      },
      {
        title: 'No paid or promotional features',
        paragraphs: [
          'There is no payment collection, automatic renewal, paid trial, marketing mailing list or review/testimonial system. Command makes no claims about fake customers, ratings or guaranteed academic outcomes.',
        ],
      },
      {
        title: 'Data requests',
        paragraphs: [
          'For data held by this installation, use Settings → Your data to export or erase it directly. You do not need to provide additional identity documents or email anyone to remove local application data. Files and backups outside the app must be managed separately.',
        ],
      },
    ],
  },
  credits: {
    title: 'Credits and licences',
    introduction:
      'Command bundles open-source components and locally drawn graphics. No advertising or analytics SDK is included.',
    sections: [
      {
        title: 'Fonts, icons and characters',
        paragraphs: [
          'The interface uses installed system fonts; no font files are downloaded or redistributed by Command. Interface icons come from Lucide under the ISC licence. UI primitives from Radix and the shadcn-style component patterns use permissive licences documented in the notices.',
          'The Command mark and Mochi, Sprout and Nimbus pixel illustrations were created within this project with coding-assistant help. They do not use stock photos, external character sprites or purchased image libraries. No claim of exclusive copyright or trademark clearance is made.',
        ],
      },
      {
        title: 'Software notices',
        paragraphs: [
          'The bundled third-party notices identify installed production dependencies, their declared licences and available licence texts. These include Next.js, React, Prisma, PostgreSQL client components and ical.js. ical.js is MPL-2.0; its source modules are included by its package. Preserve relevant notices and make covered source available when distributing a built app.',
          'The download package must also retain licences for tools or database binaries it includes. The automated notices are an inventory, not a legal determination that all distribution obligations have been satisfied.',
        ],
      },
    ],
  },
} as const;

export type LegalDocument = keyof typeof legalDocuments;
