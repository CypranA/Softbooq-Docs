# Softbooq Docs

Official documentation for the [Softbooq](https://softbooq.com) platform — ERP, Files, and AI tools for growing businesses.

Live at [docs.softbooq.com](https://docs.softbooq.com)

## What's in here

```
erp/          ERP module documentation (Finance, HR, CRM, and 14 others)
portals/      Public-facing features (Storefront, Client Portal, Careers, Landing Page)
quickstart.mdx
introduction.mdx
mint.json     Mintlify site config
```

## Running locally

```bash
npm i -g mintlify
mintlify dev
```

Opens at `http://localhost:3000`.

## Contributing

All content is MDX. Pages use standard [Mintlify components](https://mintlify.com/docs/content/components) — `<Steps>`, `<AccordionGroup>`, `<Note>`, `<Tip>`, `<Warning>`, `<CardGroup>`.

The site deploys automatically on every push to `main`.

## License

MIT
