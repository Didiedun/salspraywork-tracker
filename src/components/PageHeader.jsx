// One header pattern for every owner page: optional kicker, title, one-line
// description, and actions aligned right (wrapping below on phones).
export function PageHeader({ title, description, kicker, actions }) {
  return (
    <header className="page-heading">
      <div className="min-w-0">
        {kicker && <p className="page-kicker">{kicker}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
