const COLUMNS = [
  ['Sobre', 'Blog'],
  ['Ajuda', 'Contato'],
  ['Políticas', 'Privacidade'],
  ['Termos', 'Segurança'],
];

export function Footer() {
  return (
    <footer className="mt-8 border-t border-white/10 bg-black px-4 py-10 sm:px-8">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:grid-cols-4">
        {COLUMNS.map((col, i) => (
          <nav key={i} aria-label={`Links ${i + 1}`}>
            <ul className="space-y-2">
              {col.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-muted transition-colors hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-muted">
        © 2026 Infornet TV
      </p>
    </footer>
  );
}
