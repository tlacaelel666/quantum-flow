
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PlotView from './plot-view';
import WaveformDisplay from './waveform-display';
import { Skeleton } from "@/components/ui/skeleton";
import type { SimulationResults } from "@/lib/types";
import { FileText, Code, BarChartBig, BrainCircuit, List, Sparkles, Download, Waves } from 'lucide-react';
import { exportToCsv } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';


function TextView({ results, onDownloadCsv }: { results: SimulationResults, onDownloadCsv: () => void }) {
  const { num_qubits, circuit_depth, shots, noise_level, circuit_type, statistics, counts } = results;
  return (
    <div className="font-code text-sm space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div><strong className="text-accent">Tipo de Circuito:</strong> {circuit_type}</div>
        <div><strong className="text-accent">Cúbits:</strong> {num_qubits}</div>
        <div><strong className="text-accent">Profundidad:</strong> {circuit_depth}</div>
        <div><strong className="text-accent">Disparos (Shots):</strong> {shots}</div>
        <div><strong className="text-accent">Ruido:</strong> {noise_level.toFixed(2)}</div>
      </div>
      
      <h3 className="font-headline text-lg text-primary">Estadísticas</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(statistics).map(([key, value]) => (
              <div key={key} className="bg-muted/50 p-2 rounded-md">
                  <div className="capitalize text-muted-foreground text-xs">{key.replace(/_/g, ' ')}</div>
                  <div className="font-bold">{typeof value === 'number' ? value.toFixed(4) : value}</div>
              </div>
          ))}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-headline text-lg text-primary">Conteos</h3>
        <Button variant="outline" size="sm" onClick={onDownloadCsv}><Download className="mr-2 h-4 w-4" />Descargar CSV</Button>
      </div>
      <div className="bg-muted/50 p-4 rounded-md max-h-60 overflow-y-auto">
        {Object.entries(counts).map(([state, count]) => {
          const state_str = parseInt(state).toString(2).padStart(num_qubits, '0');
          const prob = (count / shots) * 100;
          return <p key={state}>{`|${state_str}⟩: ${count} (${prob.toFixed(2)}%)`}</p>;
        })}
      </div>
    </div>
  );
}

function JsonView({ results }: { results: SimulationResults }) {
  return (
    <pre className="bg-muted/50 p-4 rounded-md max-h-96 overflow-y-auto text-xs font-code">
      <code>{JSON.stringify(results, null, 2)}</code>
    </pre>
  );
}

function AiAnalysisView({ analysis, isLoading }: { analysis: string | null, isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }
  if (!analysis) return <div className="text-center text-muted-foreground">Ejecuta una simulación y luego haz clic en "Analizar con IA" para ver los resultados aquí.</div>;
  
  return (
    <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="font-headline text-primary" {...props} />,
            h2: ({node, ...props}) => <h2 className="font-headline text-primary" {...props} />,
            h3: ({node, ...props}) => <h3 className="font-headline text-primary" {...props} />,
            strong: ({node, ...props}) => <strong className="text-accent" {...props} />,
          }}
        >{analysis}</ReactMarkdown>
    </div>
  )
}

function LogView({ logs }: { logs: string[] }) {
    return (
        <pre className="bg-muted/50 p-4 rounded-md max-h-96 overflow-y-auto text-xs font-code">
            <code>{logs.join('\n')}</code>
        </pre>
    )
}

type OutputPanelProps = {
  results: SimulationResults | null;
  aiAnalysis: string | null;
  isAiLoading: boolean;
  onAnalyze: () => void;
  isSimulating: boolean;
  timeDomainData: Uint8Array | null;
};

export default function OutputPanel({ results, aiAnalysis, isAiLoading, onAnalyze, isSimulating, timeDomainData }: OutputPanelProps) {
  if (isSimulating && !results) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <div className="text-primary">
              <Sparkles className="h-10 w-10 animate-spin" />
            </div>
            <p className="font-headline text-lg">Ejecutando Simulación Cuántica...</p>
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground text-center">
              Configura tus parámetros de simulación arriba y haz clic en "Ejecutar Simulación" para ver los resultados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDownloadCsv = () => {
    const rows = [["State", "Binary", "Count", "Probability"]];
    if (results.counts) {
        for (const [state, count] of Object.entries(results.counts)) {
          const prob = count / results.shots;
          rows.push([state, parseInt(state).toString(2).padStart(results.num_qubits, '0'), count.toString(), prob.toString()]);
        }
    }
    exportToCsv(`quantum-flow-results.csv`, rows);
  };
  
  const hasAcousticData = !!timeDomainData;

  return (
    <Card className="border-accent/20">
       <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-2xl">Terminal de Salida</CardTitle>
                <CardDescription>Visualiza los resultados de la simulación, análisis y registros.</CardDescription>
            </div>
            <Button onClick={onAnalyze} disabled={isAiLoading}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                {isAiLoading ? "Analizando..." : "Analizar con IA"}
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="simulation">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simulation"><FileText className="mr-2 h-4 w-4"/>Simulación</TabsTrigger>
            <TabsTrigger value="ai-analysis"><BrainCircuit className="mr-2 h-4 w-4"/>Análisis IA</TabsTrigger>
            <TabsTrigger value="logs"><List className="mr-2 h-4 w-4"/>Registros</TabsTrigger>
          </TabsList>
          
          <TabsContent value="simulation" className="mt-4">
            <Tabs defaultValue="text" className="w-full">
                <TabsList>
                    <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4" />Texto</TabsTrigger>
                    <TabsTrigger value="plot"><BarChartBig className="mr-2 h-4 w-4" />Gráfico</TabsTrigger>
                    <TabsTrigger value="json"><Code className="mr-2 h-4 w-4" />JSON</TabsTrigger>
                    {hasAcousticData && <TabsTrigger value="waveform"><Waves className="mr-2 h-4 w-4" />Forma de Onda</TabsTrigger>}
                </TabsList>
                <TabsContent value="text" className="mt-4"><TextView results={results} onDownloadCsv={handleDownloadCsv} /></TabsContent>
                <TabsContent value="plot" className="mt-4"><PlotView results={results} /></TabsContent>
                <TabsContent value="json" className="mt-4"><JsonView results={results} /></TabsContent>
                {hasAcousticData && <TabsContent value="waveform" className="mt-4"><WaveformDisplay timeDomainData={timeDomainData} /></TabsContent>}
            </Tabs>
          </TabsContent>
          
          <TabsContent value="ai-analysis" className="mt-4">
            <AiAnalysisView analysis={aiAnalysis} isLoading={isAiLoading} />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <LogView logs={results.logs} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

    