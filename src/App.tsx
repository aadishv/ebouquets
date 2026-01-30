import { useCallback, useMemo, useState } from "react"
import { useDropzone } from "react-dropzone"
import Papa from "papaparse"
import { UploadSimple, FileCsv, Warning, Trash, EnvelopeSimple, Table as TableIcon, DownloadSimple, Spinner } from "@phosphor-icons/react"
import { useSelector } from "@xstate/store/react"
import { store, type FlowerOrder } from "./store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { eml } from "eml-generator"

const FLOWER_IMAGES: Record<string, string> = {
  "orange tulips": "https://cdn.inst-fs-iad-prod.inscloudgate.net/0c4a0167-6a33-4c85-b955-6276af347eb1/tulip.jpg?token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImNkbiJ9.eyJyZXNvdXJjZSI6Ii8wYzRhMDE2Ny02YTMzLTRjODUtYjk1NS02Mjc2YWYzNDdlYjEvdHVsaXAuanBnIiwidGVuYW50IjoibmV3LXF1aXp6ZXMiLCJpYXQiOjE3Njk2ODgxMjIsImV4cCI6MTc2OTczNDkyMn0.1CvfkgN3-jdqFvX37kgiiXk6e8C47lcM66tsRE7zPML7vEKLqup2csI2ON2CTrQ3v8zsdVc7TvfEc4QsUpd1sg&content_type=image%2Fjpeg",
  "white dandelions": "https://cdn.inst-fs-iad-prod.inscloudgate.net/ad3b8d44-a31b-4f01-9e54-b21574d9eeba/dandelion.jpg?token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImNkbiJ9.eyJyZXNvdXJjZSI6Ii9hZDNiOGQ0NC1hMzFiLTRmMDEtOWU1NC1iMjE1NzRkOWVlYmEvZGFuZGVsaW9uLmpwZyIsInRlbmFudCI6Im5ldy1xdWl6emVzIiwiaWF0IjoxNzY5Njg5NzA2LCJleHAiOjE3Njk3MzY1MDZ9.P0tYQrZ567Fax9Bp_ieVjzJUr7g6avNDcllf-1HNxhEOimgrXaad_f8WZEzT6eFSWPZr4iIrwhENFt_zrjEGIA&content_type=image%2Fjpeg",
  "gardenias": "https://cdn.inst-fs-iad-prod.inscloudgate.net/7232082f-15b0-49d1-8bc8-2604891eec06/gardenia.jpg?token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImNkbiJ9.eyJyZXNvdXJjZSI6Ii83MjMyMDgyZi0xNWIwLTQ5ZDEtOGJjOC0yNjA0ODkxZWVjMDYvZ2FyZGVuaWEuanBnIiwidGVuYW50IjoibmV3LXF1aXp6ZXMiLCJpYXQiOjE3Njk2OTA0OTUsImV4cCI6MTc2OTczNzI5NX0.Mdy5zog-Zv9dwuX9c9wdzlwczH1q2GZU2sSCTB32alQsnYmq3aRF2kgW4UMlonfoPzXzguA0De_rvhgGHg4Kfg&content_type=image%2Fjpeg",
  "blue cornflower": "https://cdn.inst-fs-iad-prod.inscloudgate.net/1836cc3f-8a29-4d05-91b1-ede47971bbcb/cornflower.jpg?token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImNkbiJ9.eyJyZXNvdXJjZSI6Ii8xODM2Y2MzZi04YTI5LTRkMDUtOTFiMS1lZGU0Nzk3MWJiY2IvY29ybmZsb3dlci5qcGciLCJ0ZW5hbnQiOiJuZXctcXVpenplcyIsImlhdCI6MTc2OTY5MTUxOCwiZXhwIjoxNzY5NzM4MzE4fQ.5pGcFkhWrwENj6W1Dv1SHJy3TA7XQDzJRYh8jJRrhMWZ76wh0pFB1prxLOjL10qIdD-HjhO3e0wXtWEADAsrIQ&content_type=image%2Fjpeg",
  "roses": "https://cdn.inst-fs-iad-prod.inscloudgate.net/870b4e38-b7ae-40a2-8816-7b32614ca7cc/rose.jpg?token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImNkbiJ9.eyJyZXNvdXJjZSI6Ii84NzBiNGUzOC1iN2FlLTQwYTItODgxNi03YjMyNjE0Y2E3Y2Mvcm9zZS5qcGciLCJ0ZW5hbnQiOiJuZXctcXVpenplcyIsImlhdCI6MTc2OTY5MTMyMywiZXhwIjoxNzY5NzM4MTIzfQ.t5W7jv7xP6j44JzXC3viMxx0q1WcxhgprpFh61xS-ONGZefLsx1okF_PQUc7nsPlhduuycaqt9VTI_sWNhlszg&content_type=image%2Fjpeg"
}

const generateHtml = (email: string, orders: FlowerOrder[]) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #000000; margin: 0; padding: 0; font-size: 20px; line-height: 1.5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header-image { width: 100%; height: auto; display: block; margin-bottom: 24px; border-radius: 4px; }
    .poem { font-style: italic; margin-bottom: 20px; }
    .divider { color: #d1d5db; font-size: 24px; text-align: center; margin: 30px 0; }
    .message-table { width: 100%; margin-bottom: 32px; }
    .flower-img { width: 96px; height: 96px; object-fit: cover; display: block; border: 1px solid #f3f4f6; }
    .message-text { padding-left: 20px; font-style: italic; font-family: Georgia, serif; font-size: 24px; }
    .footer { margin-top: 40px; padding-top: 30px; border-top: 1px solid #eeeeee; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://9j5dvt8v5a4l4xi0.public.blob.vercel-storage.com/shares/ift1xb3j.png" alt="Valentine's Header" class="header-image">
    
    <div style="margin-bottom: 24px;">
      <p>Dear ${email},</p>
      
      <div class="poem">
        <p style="color: #dc2626; margin: 0;">Roses are red,</p>
        <p style="color: #2563eb; margin: 0;">Violets are blue,</p>
        <p style="color: #db2777; margin: 0;">Valentine's Day is near</p>
        <p style="color: #db2777; margin: 0;">So look forward to some messages to you &lt;3</p>
      </div>
      
      <p>Hello Pixel and happy Valentine's Day! Check out these messages sent to you from other Pixels:</p>
    </div>

    ${orders.map((order) => `
      <div class="divider">--</div>
      <table class="message-table" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td width="96" valign="top">
            ${FLOWER_IMAGES[order["flower type"]?.toLowerCase()] ? `
              <img src="${FLOWER_IMAGES[order["flower type"].toLowerCase()]}" alt="${order["flower type"]}" class="flower-img">
            ` : '<div style="width: 96px; height: 96px;"></div>'}
          </td>
          <td class="message-text" valign="middle">
            "${order.message}"
          </td>
        </tr>
      </table>
    `).join('')}

    <div class="footer">
      <p>sent with &lt;3 from Pixel the Pixel and your Board of Communications</p>
    </div>
  </div>
</body>
</html>
  `;
};

export default function App() {
  const data = useSelector(store, (state) => state.context.orders)
  const error = useSelector(store, (state) => state.context.error)
  const [isGenerating, setIsGenerating] = useState(false)

  const groupedOrders = useMemo(() => {
    const groups: Record<string, FlowerOrder[]> = {}
    data.forEach(order => {
      const email = order.to || "Unknown Recipient"
      if (!groups[email]) {
        groups[email] = []
      }
      groups[email].push(order)
    })
    return groups
  }, [data])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    store.send({ type: 'setError', error: null })
    const file = acceptedFiles[0]

    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields || []
        const requiredFields = ["flower type", "message", "to"]
        const missingFields = requiredFields.filter(
          (field) => !fields.includes(field)
        )

        if (missingFields.length > 0) {
          store.send({ 
            type: 'setError', 
            error: `Missing required fields: ${missingFields.join(", ")}` 
          })
          store.send({ type: 'setOrders', orders: [] })
          return
        }

        store.send({ type: 'setOrders', orders: results.data as FlowerOrder[] })
      },
      error: (err) => {
        store.send({ type: 'setError', error: `Error parsing CSV: ${err.message}` })
      },
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  })

  const handleReset = () => {
    store.send({ type: 'reset' })
  }

  const loadSampleData = async () => {
    store.send({ type: 'setError', error: null })
    try {
      const response = await fetch('/data.csv')
      const csvText = await response.text()
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const fields = results.meta.fields || []
          const requiredFields = ["flower type", "message", "to"]
          const missingFields = requiredFields.filter(
            (field) => !fields.includes(field)
          )

          if (missingFields.length > 0) {
            store.send({ 
              type: 'setError', 
              error: `Sample data is invalid. Missing: ${missingFields.join(", ")}` 
            })
            return
          }

          store.send({ type: 'setOrders', orders: results.data as FlowerOrder[] })
        },
        error: (err) => {
          store.send({ type: 'setError', error: `Error parsing sample data: ${err.message}` })
        },
      })
    } catch (err) {
      store.send({ type: 'setError', error: "Failed to load sample data." })
    }
  }

  const handleDownloadEmls = async () => {
    setIsGenerating(true);
    try {

      const entries = Object.entries(groupedOrders);
      
      const createEmlContent = (emailAddr: string, orders: FlowerOrder[]) => {
        const html = generateHtml(emailAddr, orders);
        return eml({
          from: "Pixel the Pixel <noreply@ebouqets.com>",
          to: emailAddr,
          subject: "A Valentine's Day Surprise for You! <3",
          html: html
        });
      };

      if (entries.length === 1) {
        const [email, orders] = entries[0];
        const emlContent = createEmlContent(email, orders);
        
        // Use binary blob with explicit byte encoding to prevent UTF-8 corruption
        // We convert the string to a Uint8Array using a method that preserves 1:1 mapping for the binary parts
        const buf = new Uint8Array(emlContent.length);
        for (let i = 0; i < emlContent.length; i++) {
          buf[i] = emlContent.charCodeAt(i) & 0xff;
        }
        
        const blob = new Blob([buf], { type: "message/rfc822" });
        const safeFilename = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        saveAs(blob, `${safeFilename}.eml`);
      } else {
        const zip = new JSZip();
        for (const [email, orders] of entries) {
          const emlContent = createEmlContent(email, orders);
          
          const buf = new Uint8Array(emlContent.length);
          for (let i = 0; i < emlContent.length; i++) {
            buf[i] = emlContent.charCodeAt(i) & 0xff;
          }
          
          const safeFilename = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          zip.file(`${safeFilename}.eml`, buf);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        saveAs(blob, "ebouqets-emails.zip");
      }
    } catch (err) {
      console.error("Generation failed", err);
      store.send({ type: 'setError', error: "Failed to generate EML files." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black tracking-tighter py-8 font-[family-name:var(--font-serif)] text-primary">
          eBouqets
        </h1>
      </div>

      {!data.length && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 transition-all duration-200 cursor-pointer
            flex flex-col items-center justify-center gap-4
            ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <UploadSimple size={32} weight="bold" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">
              {isDragActive ? "Drop the CSV here" : "Click or drag CSV file here"}
            </p>
            <p className="text-sm text-muted-foreground">
              Must include "flower type", "message", and "to" columns
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-3 border border-destructive/20 animate-in fade-in slide-in-from-top-2">
          <Warning size={20} weight="fill" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold tracking-tight">Orders Dashboard</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleDownloadEmls}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Spinner size={16} className="animate-spin" />
                ) : (
                  <DownloadSimple size={16} />
                )}
                {Object.keys(groupedOrders).length === 1 ? 'Download EML' : 'Download All EMLs'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 border-muted-foreground/20">
                    <Trash size={16} />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all parsed flower orders and you'll have to upload the CSV again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleReset}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reset Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <Tabs defaultValue="parsed" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1">
              <TabsTrigger value="parsed" className="gap-2 py-2">
                <TableIcon size={18} />
                Parsed Orders
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2 py-2">
                <EnvelopeSimple size={18} />
                Email Preview
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="parsed">
              <div className="border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[100px] font-bold">Flower</TableHead>
                      <TableHead className="font-bold">To</TableHead>
                      <TableHead className="font-bold">Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell>
                          {FLOWER_IMAGES[row["flower type"]?.toLowerCase()] ? (
                            <div className="flex flex-col items-center gap-1">
                              <img
                                src={FLOWER_IMAGES[row["flower type"].toLowerCase()]}
                                alt={row["flower type"]}
                                className="w-12 h-12 object-cover rounded-md border"
                              />
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center">
                                {row["flower type"]}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-[10px] text-muted-foreground border uppercase font-bold">
                                None
                              </div>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center">
                                {row["flower type"] || 'None'}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{row.to}</TableCell>
                        <TableCell className="text-muted-foreground italic whitespace-normal max-w-md">
                          "{row.message}"
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {Object.entries(groupedOrders).map(([email, orders], index) => (
                    <AccordionItem key={email} value={`item-${index}`} className="border rounded-xl overflow-hidden shadow-sm bg-card transition-all hover:border-primary/20">
                      <AccordionTrigger className="hover:no-underline px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                            <EnvelopeSimple size={20} weight="bold" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="font-bold text-base leading-none mb-1 truncate">{email}</p>
                            <p className="text-xs text-muted-foreground tracking-tight">Previewing email with {orders.length} message{orders.length === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-0">
                        <div className="bg-white p-8 md:p-12 font-[family-name:var(--font-arial)] text-black text-xl md:text-2xl leading-relaxed border-t shadow-inner">
                          <div className="max-w-2xl mx-auto space-y-6">
                            <div className="space-y-6">
                              <img 
                                src="https://9j5dvt8v5a4l4xi0.public.blob.vercel-storage.com/shares/ift1xb3j.png" 
                                alt="Email Header" 
                                className="w-full h-auto object-cover rounded-sm"
                              />
                              <p>Dear {email},</p>
                              <div className="space-y-0 italic">
                                <p className="text-red-600">Roses are red,</p>
                                <p className="text-blue-600">Violets are blue,</p>
                                <p className="text-pink-600">Valentine's Day is near</p>
                                <p className="text-pink-600">So look forward to some messages to you &lt;3</p>
                              </div>
                              <p>
                                Hello Pixel and happy Valentine's Day! Check out these messages sent to you from other Pixels:
                              </p>
                            </div>

                            <div className="space-y-8 py-4">
                              {orders.map((order, orderIdx) => (
                                <div key={orderIdx} className="space-y-4">
                                  <div className="flex justify-center">
                                    <span className="text-gray-300 text-xl">--</span>
                                  </div>
                                  <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-shrink-0">
                                      {FLOWER_IMAGES[order["flower type"]?.toLowerCase()] ? (
                                        <img
                                          src={FLOWER_IMAGES[order["flower type"].toLowerCase()]}
                                          alt={order["flower type"]}
                                          className="w-24 h-24 object-cover"
                                        />
                                      ) : (
                                        <div className="w-24 h-24" />
                                      )}
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                      <p className="italic font-serif leading-tight">
                                        "{order.message}"
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="pt-8 text-center border-t border-gray-100">
                              <p>
                                sent with &lt;3 from Pixel the Pixel and your Board of Communications
                              </p>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {data.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
          <div className="flex flex-col items-center">
            <FileCsv size={48} weight="thin" className="mb-2 opacity-20" />
            <p>No data to display yet</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadSampleData} className="gap-2">
            <FileCsv size={16} />
            Load Sample Data
          </Button>
        </div>
      )}
    </div>
  )
}
