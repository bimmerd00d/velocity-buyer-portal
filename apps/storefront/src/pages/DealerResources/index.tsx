import { useState } from 'react';

const resourceBase = 'https://velocity-buyer-portal.vercel.app/dealer-resources';

const categories = ['All', 'Guides', 'Training', 'Brand assets', 'Ordering tools'] as const;
type Category = (typeof categories)[number];

const resources = [
  {
    title: 'Installation planning checklist',
    category: 'Guides',
    format: 'Printable guide',
    copy: 'A five-step handoff from the sales counter to the installation bay. Confirm the vehicle, parts, and job requirements.',
    file: 'installation-planning.html',
    action: 'Open guide',
  },
  {
    title: 'A new buyer’s first order',
    category: 'Training',
    format: '5-minute read',
    copy: 'Introduce buyers to shopping lists, purchase references, account pricing, and invoice follow-up.',
    file: 'buyer-training.html',
    action: 'Start walkthrough',
  },
  {
    title: 'Velocity Dealer brand kit',
    category: 'Brand assets',
    format: 'ZIP · SVG artwork',
    copy: 'Download the dealer logo lockups and palette notes for a presentation, counter display, or local campaign.',
    file: 'velocity-dealer-brand-kit.zip',
    action: 'Download kit',
    download: true,
    brand: true,
  },
  {
    title: 'Parts-planning worksheet',
    category: 'Ordering tools',
    format: 'CSV · Spreadsheet',
    copy: 'Start a job-based parts list with example Kenwood and Kicker entries. Track quantities, fitment checks, and notes.',
    file: 'parts-planning.csv',
    action: 'Download worksheet',
    download: true,
  },
  {
    title: 'Warranty & returns intake',
    category: 'Guides',
    format: 'Printable checklist',
    copy: 'Gather purchase details, symptoms, and supporting information before requesting return authorization.',
    file: 'warranty-intake.html',
    action: 'Open checklist',
  },
  {
    title: 'Brand essentials',
    category: 'Brand assets',
    format: 'Printable reference',
    copy: 'Logo placement, the Dealer color palette, and practical guidance for consistent collateral.',
    file: 'brand-guidelines.html',
    action: 'View guidelines',
    brand: true,
  },
] as const;

function ResourceIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M12 5h17l8 8v30H12zM29 5v9h8M18 22h13M18 28h13M18 34h8" />
    </svg>
  );
}

function DealerResources() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleResources = resources.filter(
    (resource) =>
      (category === 'All' || resource.category === category) &&
      `${resource.title} ${resource.copy}`.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <section className="dealer-resources" aria-label="Dealer resources">
      <div className="dealer-resources__heading">
        <p>Practical tools for the counter, the installation bay, and your next campaign.</p>
      </div>

      <label className="dealer-resources__search" htmlFor="dealer-resources-query">
        <span className="dealer-resources__search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          id="dealer-resources-query"
          aria-label="Search dealer resources"
          type="search"
          placeholder="Search guides, training, and assets"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="dealer-resources__filters" role="group" aria-label="Resource categories">
        {categories.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={category === option}
            onClick={() => setCategory(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {visibleResources.length > 0 ? (
        <div className="dealer-resources__grid">
          {visibleResources.map((resource) => (
            <article
              key={resource.file}
              className={`dealer-resources__card${'brand' in resource && resource.brand ? ' dealer-resources__card--brand' : ''}`}
            >
              <div className="dealer-resources__art">
                {'brand' in resource && resource.brand ? (
                  <img src={`${resourceBase}/assets/account-logo.svg`} alt="Velocity Dealer" />
                ) : (
                  <ResourceIcon />
                )}
                <small>{resource.format}</small>
              </div>
              <div className="dealer-resources__body">
                <span className="dealer-resources__category">{resource.category}</span>
                <h2>{resource.title}</h2>
                <p>{resource.copy}</p>
                <a
                  href={`${resourceBase}/resources/${resource.file}`}
                  download={'download' in resource && resource.download ? resource.file : undefined}
                  target={'download' in resource && resource.download ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="dealer-resources__action"
                >
                  {resource.action}{' '}
                  <span aria-hidden="true">
                    {'download' in resource && resource.download ? '↓' : '↗'}
                  </span>
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="dealer-resources__empty" role="status">
          No matching resources. Try another search or category.
        </p>
      )}

      <p className="dealer-resources__footnote">
        Guides open in a new tab and can be printed or saved as PDF. Downloads are working example
        files for presentations and walkthroughs.
      </p>
    </section>
  );
}

export default DealerResources;
