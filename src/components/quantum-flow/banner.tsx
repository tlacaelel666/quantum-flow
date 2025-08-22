'use client';

const banner = `
╔════════════════════════════════════════════════════════════════╗
█                                                                █
█    _____ _   _  ___  ____ _________________________
█  /  __  \\ | | |/ _ \\|  _ \\|  ___/\\/  | | |   \\  | |__ \     █
█  | |  | | | | ||| ||| |_| ) |_| |\\/| | | | |\\ \\ | || | |    █
█  | |__| | |_| |||_||| |\\ <| |_|_|  | | | | | \\ \\\| ||__| |    █
█       | |                     | |                              █
▓       | |                     | |                                ▓
▓       | |        // Quantum State Preparation Base              ▓
▒                                                                ▒
▒                              [ version 1.0.0 ]                 ▒
░                                                                ░
╚════════════════════════════════════════════════════════════════╝
`;

export default function Banner() {
  return (
    <div className="text-sm text-primary font-code leading-tight bg-card p-4 rounded-lg shadow-lg border border-primary/20 overflow-x-auto">
      <pre className="whitespace-pre">{banner}</pre>
    </div>
  );
}
