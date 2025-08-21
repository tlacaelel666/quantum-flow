'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Play, Settings2, Cpu, Repeat, Thermometer, Eye } from 'lucide-react';
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
  isLoading: boolean;
};

export default function ConfigPanel({ onSimulate, isLoading }: ConfigPanelProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      circuit_type: "bell",
      num_qubits: 3,
      depth: 5,
      shots: 1000,
      noise_level: 0.05,
      verbose: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSimulate(values);
  }

  const circuitType = form.watch('circuit_type');

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Settings2 className="text-accent" />
          Simulation Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="circuit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Cpu size={16}/>Circuit Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a circuit type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bell">Bell State</SelectItem>
                        <SelectItem value="ghz">GHZ State</SelectItem>
                        <SelectItem value="qft">Quantum Fourier Transform</SelectItem>
                        <SelectItem value="random">Random Circuit</SelectItem>
                        <SelectItem value="custom" disabled>Custom (Not Implemented)</SelectItem>
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
                    <FormLabel className="flex items-center gap-2"><Cpu size={16}/>Number of Qubits</FormLabel>
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
                      <FormLabel className="flex items-center gap-2"><Cpu size={16}/>Circuit Depth</FormLabel>
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
                    <FormLabel className="flex items-center gap-2"><Repeat size={16}/>Shots</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            <FormField
              control={form.control}
              name="noise_level"
              render={({ field: { value, onChange } }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Thermometer size={16}/>Noise Level: {value.toFixed(2)}</FormLabel>
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
                    <FormLabel className="flex items-center gap-2"><Eye size={16}/>Verbose Logging</FormLabel>
                    <FormDescription>Show detailed logs in the output.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              <Play className="mr-2 h-4 w-4" />
              {isLoading ? "Simulating..." : "Run Simulation"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
