
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { generateQuotePdf } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";

const numberFromInput = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isNaN(parsed) ? undefined : parsed;
};

const lineItemSchema = z.object({
  description: z.string().min(1, "La descripción es requerida."),
  price: z.preprocess(
    numberFromInput,
    z.number().positive("El precio debe ser un número positivo.")
  ),
});

const quoteSchema = z.object({
  quoteTitle: z.string().min(1, "El título de la cotización es requerido."),
  quoteNumber: z.string(),
  quoteDate: z.date({ required_error: "La fecha es requerida." }),
  clientName: z.string().min(1, "El nombre del cliente es requerido."),
  contact: z.string().min(1, "El contacto es requerido."),
  workDuration: z
    .string()
    .min(1, "La duración del trabajo es requerida."),
  method: z.string().min(1, "El método es requerido."),
  provider: z.string().min(1, "El proveedor es requerido."),
  serviceGoal: z
    .string()
    .min(1, "El objetivo del servicio es requerido."),
  serviceIncludes: z
    .string()
    .min(1, "Debe indicar lo que incluye el servicio."),
  deliveryTime: z
    .string()
    .min(1, "El tiempo de entrega es requerido."),
  includedBonus: z
    .string()
    .min(1, "El bonus incluido es requerido."),
  whyCreati: z
    .string()
    .min(1, "Explique por qué hacerlo con Creati Solutions."),
  items: z.array(lineItemSchema).min(1, "Debe agregar al menos un ítem."),
  includeDiscount: z.boolean(),
  discountPercentage: z.preprocess(
    numberFromInput,
    z.number().min(0, "El descuento no puede ser negativo.").max(100, "El descuento no puede ser mayor a 100.").optional()
  ).optional(),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(amount);
};

export function QuoteGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  const generateQuoteNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `C${year}${random}`;
  };

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      quoteTitle: "",
      quoteNumber: "",
      quoteDate: undefined,
      clientName: "",
      contact: "",
      workDuration: "",
      method: "",
      provider: "",
      serviceGoal: "",
      serviceIncludes: "",
      deliveryTime: "",
      includedBonus: "",
      whyCreati: "",
      items: [{ description: "", price: 0 }],
      includeDiscount: false,
      discountPercentage: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (isClient) {
      form.setValue("quoteNumber", generateQuoteNumber());
      form.setValue("quoteDate", new Date());
    }
  }, [form, isClient]);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const watchedItems = form.watch("items");
  const includeDiscount = form.watch("includeDiscount");
  const discountPercentage = form.watch("discountPercentage") || 0;

  const subtotal = watchedItems.reduce(
    (acc, item) => acc + (Number(item.price) || 0),
    0
  );
  const discountAmount =
    includeDiscount && discountPercentage > 0
      ? (subtotal * discountPercentage) / 100
      : 0;
  const totalAfterDiscount = subtotal - discountAmount;
  const iva = totalAfterDiscount * 0.12;
  const total = totalAfterDiscount + iva;

  const onSubmit = async (data: QuoteFormValues) => {
    setIsLoading(true);
    try {
      await generateQuotePdf(data);
      toast({
        title: "PDF Generado",
        description: "La cotización ha sido generada y descargada.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF.",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return null;
  }
  
  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-primary">
              Crear Cotización
            </CardTitle>
            <CardDescription>
              Complete los campos para generar una nueva cotización en formato
              PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
             <FormField
                control={form.control}
                name="quoteTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título de la Cotización</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Propuesta de Rediseño Web" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="Persona de contacto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración del Trabajo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. 2 semanas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Remoto / Presencial" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quoteNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cotización No.</FormLabel>
                    <FormControl>
                      <Input readOnly disabled {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quoteDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de cotización</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Seleccione una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="serviceGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo del Servicio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa el objetivo del servicio"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceIncludes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lo que Incluye el Servicio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalle los entregables o alcances incluidos"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="deliveryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiempo de Entrega</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. 5 días hábiles" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="includedBonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bonus Incluido</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa el bonus o beneficios incluidos"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="whyCreati"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Por qué hacerlo con Creati Solutions?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Resalte los motivos o ventajas"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <h3 className="text-lg font-semibold mb-4">Ítems de la Cotización</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%]">Descripción</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Descripción del servicio o producto" {...field}/>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" placeholder="0.00" className="text-right" {...field}/>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => append({ description: "", price: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Ítem
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-end gap-4">
             <div className="w-full max-w-sm space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                 <FormField
                    control={form.control}
                    name="includeDiscount"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Incluir Descuento</FormLabel>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                {includeDiscount && (
                   <FormField
                    control={form.control}
                    name="discountPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porcentaje de Descuento (%)</FormLabel>
                        <FormControl>
                           <Input type="number" placeholder="0" min="0" max="100" {...field} />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                 {includeDiscount && discountAmount > 0 && (
                     <div className="flex items-center justify-between text-destructive">
                        <span >Descuento ({discountPercentage}%)</span>
                        <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                    </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">IVA (12%)</span>
                    <span className="font-medium">{formatCurrency(iva)}</span>
                </div>
                 <Separator />
                 <div className="flex items-center justify-between text-lg font-bold">
                    <span>TOTAL</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>
             <Button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto bg-accent hover:bg-accent/90"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Generar PDF
              </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
