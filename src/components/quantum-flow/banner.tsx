'use client';

const banner = `
╔════════════════════════════════════════════════════════════════╗
█                                                                █
█    ____  _   _  ____  ____  _____  __  __  _  _   _  ____      █
█   / __ \| | | |/ __ \|  _ \| ____||  \/  || || \ | || __ \     █
█  | |  | | | | | |  | | |_) |  _|  | |\/| || ||  \| |||  | |    █
█  | |__| | |_| | |__| |  _ <| |___ | |  | || || |\  |||__| |    █
█   \___\_\\___/ \____/|_| \_\_____||_|  |_||_||_| \_||____/     █
█                                                                █
▓                                                                ▓
▓                 // Quantum State Preparation Base //           ▓
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
