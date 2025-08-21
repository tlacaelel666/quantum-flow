'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as CardDescriptionComponent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Play, Settings2, Cpu, Repeat, Thermometer, Eye, Info, Mic } from 'lucide-react';
import type { CircuitConfig } from '@/lib/types';

const formSchema = z.object({
  circuit_type: z.string().min(1, 'Circuit type is required.'),
  num_qubits: z.coerce.number().int().min(2, "At least 2 qubits required.").max(12, "Maximum 12 qubits."),
  depth: z.coerce.number().int().min(1, "Depth must be at least 1.").max(50),
  shots: z.coerce.number().int().min(100).max(10000),
  noise_level: z.coerce.number().min(0).max(1),
  verbose: z.boolean(),
});

type ConfigPanelProps = {
  onSimulate: (config: CircuitConfig) => void;
  onAcousticSimulate: (config: CircuitConfig) => void;
  isLoading: boolean;
  isRecording: boolean;
};

const circuitDescriptions: Record<string, { title: string, description: string, parameters: string } | null> = {
  bell: {
    title: "Estado de Bell",
    description: "Un ejemplo fundamental de entrelazamiento cuántico, que crea un par de cúbits con resultados de medición correlacionados.",
    parameters: "El estado base es una superposición de |00⟩ y |11⟩. El número de cúbits se establece internamente en 2 para un par de Bell clásico, pero la simulación se generaliza para N cúbits al entrelazar el primero y el último."
  },
  ghz: {
    title: "Estado GHZ",
    description: "El estado Greenberger-Horne-Zeilinger (GHZ) es un estado cuántico entrelazado que involucra a tres o más cúbits.",
    parameters: "El estado base es una superposición de todos los cúbits en 0 y todos los cúbits en 1 (|00...0⟩ + |11...1⟩)."
  },
  qft: {
    title: "Transformada Cuántica de Fourier",
    description: "El análogo cuántico de la transformada discreta de Fourier, es un componente clave en muchos algoritmos cuánticos, como el algoritmo de Shor.",
    parameters: "Esta simulación aplica la QFT al estado inicial |00...0⟩, lo que resulta en una superposición igual de todos los estados de la base computacional."
  },
  random: {
    title: "Circuito Aleatorio",
    description: "Genera un circuito con compuertas cuánticas aleatorias, a menudo utilizado para comparar hardware cuántico y explorar la dinámica cuántica caótica.",
    parameters: "El circuito se construye con compuertas aleatorias de un solo cúbit y de dos cúbits hasta una 'Profundidad de Circuito' especificada."
  },
  acoustic: {
    title: "Circuito Acústico",
    description: "Utiliza la entrada del micrófono para generar un estado cuántico inicial basado en las características de frecuencia del sonido capturado.",
    parameters: "Las amplitudes de frecuencia del análisis FFT del audio se utilizan para ponderar las probabilidades de los estados base de la simulación."
  },
  custom: {
    title: "Circuito Personalizado",
    description: "Esta opción te permitirá definir tu propio circuito cuántico.",
    parameters: "Aún no implementado."
  },
};

export default function ConfigPanel({ onSimulate, isLoading, isRecording }: ConfigPanelProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      circuit_type: "bell",
      num_qubits: 5,
      depth: 10,
      shots: 1000,
      noise_level: 0.05,
      verbose: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSimulate(values);
  }

  const circuitType = form.watch('circuit_type');
  const selectedCircuitInfo = circuitDescriptions[circuitType];

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Settings2 className="text-accent" />
          Configuración de Simulación
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="circuit_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Cpu size={16}/>Tipo de Circuito</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecciona un tipo de circuito" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bell">Estado de Bell</SelectItem>
                          <SelectItem value="ghz">Estado GHZ</SelectItem>
                          <SelectItem value="qft">Transformada Cuántica de Fourier</SelectItem>
                          <SelectItem value="random">Circuito Aleatorio</SelectItem>
                          <SelectItem value="acoustic">Circuito Acústico</SelectItem>
                          <SelectItem value="custom" disabled>Personalizado (No Implementado)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="num_qubits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Cpu size={16}/>Número de Cúbits</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                {circuitType === 'random' && (
                  <FormField
                    control={form.control}
                    name="depth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Cpu size={16}/>Profundidad del Circuito</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="shots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Repeat size={16}/>Disparos (Shots)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {selectedCircuitInfo && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-headline">
                      <Info size={18} className="text-accent" />
                      {selectedCircuitInfo.title}
                    </CardTitle>
                    <CardDescriptionComponent>{selectedCircuitInfo.description}</CardDescriptionComponent>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-bold text-sm mb-2">Parámetros del Estado Base:</h4>
                    <p className="text-xs text-muted-foreground">{selectedCircuitInfo.parameters}</p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <Separator />
            
            <FormField
              control={form.control}
              name="noise_level"
              render={({ field: { value, onChange } }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Thermometer size={16}/>Nivel de Ruido: {value.toFixed(2)}</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      defaultValue={[value]}
                      onValueChange={(vals) => onChange(vals[0])}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="verbose"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2"><Eye size={16}/>Registro Detallado</FormLabel>
                    <FormDescription>Mostrar registros detallados en la salida.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {circuitType === 'acoustic' ? (
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading || isRecording}>
                <Mic className="mr-2 h-4 w-4" />
                {isRecording ? "Grabando..." : (isLoading ? "Simulando..." : "Grabar y Simular")}
              </Button>
            ) : (
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                <Play className="mr-2 h-4 w-4" />
                {isLoading ? "Simulando..." : "Ejecutar Simulación"}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
