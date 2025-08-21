import QuantumFlowPage from '@/components/quantum-flow/quantum-flow-page';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-5xl">
        <QuantumFlowPage />
      </div>
    </main>
  );
}
