export const policyUpdated = 'October 6, 2026';
export const calendarNoticeVersion = '2026-10-01';

export const legalDocuments = {
  privacy: {
    title: 'Privacy policy',
    introduction:
      'Command is a locally run study planner with an optional hosted syllabus reader. This policy describes the local planner and that reading service.',
    sections: [
      {
        title: 'What stays on your computer',
        paragraphs: [
          'Your courses, assessments, grades, tasks, subtasks, notes, calendar entries, semesters and preferences are stored in the PostgreSQL database used by your installation. A display name is optional; a nickname or no name works. Command does not require an account, email address, date of birth, student ID or payment details.',
          'Your planner database stays on your computer. Syllabus imports send only the chosen document and course context to the online reader as described below. If you choose a remotely hosted database, network drive, cloud backup or modified deployment, that provider may process your data under its own terms. The bundled database is local; it is not encrypted by Command. Protect your device account, disk and backups.',
        ],
      },
      {
        title: 'Calendar connections',
        paragraphs: [
          'Previewing a subscription sends the link to your local Command server, which requests the calendar from its provider. The provider receives the request and may log your network address and the feed credential. Preview data is not saved to the database unless you choose Connect and import.',
          'Connecting saves the private feed URL, selected dates and time zone, imported entries, sync status and the date/version of the connection notice you accepted. The server checks approximately every 15 minutes while running. Feed links can grant calendar access; do not publish them or put them in a shared repository.',
          'Disconnect stops checks but retains the link for reconnection. Forget link removes the saved connection and sync mapping while keeping imported academic entries. You can delete those entries individually or erase your workspace. Reimporting a forgotten connection can create duplicates.',
        ],
      },
      {
        title: 'Syllabus imports',
        paragraphs: [
          'Choosing a syllabus file starts AI reading automatically after you select a course. Uploading a PDF/TXT or submitting pasted text sends its content and the selected course code/name and semester dates to Command’s hosted reading service and then OpenAI through your local server. Your other courses, saved grades, notes and calendar credentials are not included. The upload screen explains this transfer before you choose a file. Users do not configure an AI key or account. The service operator manages the provider connection and its costs; request allowances apply.',
          'Original files and previews are processed in memory and are not saved by Command’s reader. Its usage database stores aggregate request counts and daily rotating, keyed hashes of network addresses or prefixes to enforce allowances. Daily identifiers are pruned hourly after the next UTC day begins; aggregate monthly counters expire the next month. Hosting logs and disk snapshots may have separate retention, which must be documented for the chosen host before public release. Requests use inline PDF data rather than persistent file uploads and disable response storage. Provider retention rules still apply: OpenAI may retain API content for abuse monitoring and other permitted purposes. Disabling response storage does not guarantee zero retention. Review the provider’s current data controls at developers.openai.com/api/docs/guides/your-data before submitting sensitive documents.',
          'Saving reviewed assessments stores their dates and weights locally; new assessments also keep the displayed source excerpt and page reference in their notes. Existing matched assessments retain their original notes and grades. Discarding the preview does not save academic records, but cannot undo a request already sent to the provider. Erasing Command’s workspace does not erase provider-held copies, hosting logs or temporary service usage counters.',
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
          'There is no publisher-held account database to submit a deletion request to in this edition. If you voluntarily send data to a future support contact, its handling and deletion process must be disclosed at that time. No support request form is active now.',
        ],
      },
      {
        title: 'Retention and safeguards',
        paragraphs: [
          'Workspace records remain until you delete them. There is no scheduled expiry. Application error logs omit raw database errors and feed credentials. Database, operating-system, proxy or calendar-provider logs are outside Command’s deletion function.',
          'The app binds to your own computer and rejects non-local workspace requests as an additional safeguard. This is not a multi-user authorization system. Do not expose the app through a public tunnel or server. Other people or software with access to your device or database may be able to access your workspace.',
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
      'These terms describe the current local preview of Command. Public-release operator and contact details are still pending.',
    sections: [
      {
        title: 'Using the local application',
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
          'Keep the application local, protect your computer and database, and keep private backups if you need them. A JSON export is a readable data copy; an automatic restore tool is not included. Deleting your workspace cannot remove independently created backups or provider records.',
          'The application has no accounts, cloud sync, hosted recovery service, or remote support access. You can stop using it at any time, disconnect feeds, erase workspace data and uninstall it. Stopping the server stops calendar refreshes.',
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
      'The current Command application does not set cookies or use browser storage to track you.',
    sections: [
      {
        title: 'What the app uses',
        paragraphs: [
          'Academic data and preferences are stored in your installation’s PostgreSQL database. The app does not use localStorage, sessionStorage, advertising IDs or tracking pixels. Temporary page state, previews and mouse positions live in browser memory and are not persistent tracking records.',
          'Your browser may cache application files as part of ordinary browsing. Workspace responses are marked private and no-store. Calendar providers are contacted by your local server when you preview or connect a feed.',
        ],
      },
      {
        title: 'Why there is no cookie banner',
        paragraphs: [
          'There are no optional tracking technologies to accept or reject, so the app does not show a consent banner or ask for meaningless consent. If a future version introduces analytics, advertising or other non-essential storage, it must be audited and any required consent obtained before those technologies run. Declining optional uses must remain possible.',
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
          'An accessibility and security reporting contact will be added with the public release. No feedback form collects personal information in this local preview.',
        ],
      },
    ],
  },
  about: {
    title: 'About this edition',
    introduction:
      'Command is a downloadable, locally run personal study planner. The planner is not a public multi-user workspace. Optional syllabus imports use a separate hosted reading service.',
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
