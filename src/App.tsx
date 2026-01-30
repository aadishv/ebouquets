import { useCallback, useMemo, useState, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import Papa from "papaparse"
import { useSelector } from "@xstate/store/react"
import { store, type ProcessedFlowerOrder } from "./store"
import { parseFlowerHtml } from "./lib/flowerParser"
import { generateBouquetImage } from "./lib/bouquetGenerator"
import JSZip from "jszip"
import { eml } from "eml-generator"
// @ts-expect-error - file-saver has no type definitions
import { saveAs } from "file-saver"

import 'mdui/components/button.js';
import 'mdui/components/icon.js';
import 'mdui/components/card.js';
import 'mdui/components/divider.js';
import 'mdui/components/linear-progress.js';
import 'mdui/components/top-app-bar.js';
import 'mdui/components/top-app-bar-title.js';
import 'mdui/components/list.js';
import 'mdui/components/list-item.js';
import 'mdui/components/collapse.js';
import 'mdui/components/collapse-item.js';
import 'mdui/components/dialog.js';

type EmlAttachment = {
  filename?: string;
  name?: string;
  contentType?: string;
  inline?: boolean;
  cid?: string;
  data: string | Uint8Array;
};

type EmailBuildResult = {
  html: string;
  attachments: EmlAttachment[];
};

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { contentType: match[1], base64Data: match[2] };
};

const buildEmail = (email: string, orders: ProcessedFlowerOrder[]): EmailBuildResult => {
  const name = orders[0]?.name || email;
  const attachments: EmlAttachment[] = [];

  const orderHtml = orders
    .map((order, index) => {
      let bouquetHtml = '';
      if (order.bouquetImage) {
        const parsed = parseDataUrl(order.bouquetImage);
        if (parsed) {
          const cid = `bouquet-${index}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
          const extension = parsed.contentType.split("/")[1] || "jpg";
          attachments.push({
            filename: `bouquet-${index}.${extension}`,
            contentType: parsed.contentType,
            inline: true,
            cid,
            data: atob(parsed.base64Data)
          });
          bouquetHtml = `
            <div class="bouquet-container">
              <img src="cid:${cid}" alt="Bouquet" style="max-width: 100%; height: auto;">
            </div>
          `;
        }
      }

      return `
        <div class="order-unit">
          ${bouquetHtml}
          <div class="message-text">"${order.message}"</div>
        </div>
      `;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; margin: 0; padding: 0; font-size: 18px; line-height: 1.4; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header-image { width: 100%; height: auto; display: block; margin-bottom: 24px; }
    .poem { font-style: italic; margin-bottom: 20px; }
    .divider { color: #ccc; text-align: center; margin: 30px 0; }
    .message-text { font-style: italic; font-family: Georgia, serif; font-size: 22px; text-align: center; flex: 1 1 250px; }
    .bouquet-container { text-align: center; flex: 0 1 200px; }
    .order-unit { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 20px; margin-bottom: 40px; }
    .order-unit:last-child { margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://9j5dvt8v5a4l4xi0.public.blob.vercel-storage.com/shares/ift1xb3j.png" alt="Valentine's Header" class="header-image">
    <p>Dear ${name},</p>
    <div class="poem">
      <p style="color: #d00;">Roses are red,</p>
      <p style="color: #00d;">Violets are blue,</p>
      <p>Valentine's Day is near</p>
      <p>So look forward to some messages to you &lt;3</p>
    </div>
    <p>Check out these messages sent to you:</p>
    <div class="divider">---</div>
    ${orderHtml}
    <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 14px; color: #999;">
      sent with &lt;3 from Pixel the Pixel
    </div>
  </div>
</body>
</html>`;

  return { html, attachments };
};

export default function App() {
  const data = useSelector(store, (state) => state.context.orders)
  const processedOrders = useSelector(store, (state) => state.context.processedOrders)
  const error = useSelector(store, (state) => state.context.error)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  useEffect(() => {
    if (data.length === 0) return
    const process = async () => {
      setIsProcessing(true)
      const processed: ProcessedFlowerOrder[] = []
      
      for (const o of data) {
        const flowerUrls = parseFlowerHtml(o["flower type"]).map(f => f.url).filter(Boolean) as string[]
        const bouquetImage = await generateBouquetImage(flowerUrls) || undefined
        processed.push({
          ...o,
          flowers: flowerUrls,
          bouquetImage
        })
      }
      
      store.send({ type: 'setProcessedOrders', processed })
      setIsProcessing(false)
    }
    process()
  }, [data])

  const grouped = useMemo(() => {
    const g: Record<string, ProcessedFlowerOrder[]> = {}
    processedOrders.forEach(o => {
      if (!g[o.to]) g[o.to] = []
      g[o.to].push(o)
    })
    return g
  }, [processedOrders])

  const onDrop = useCallback((files: File[]) => {
    if (!files[0]) return
    Papa.parse(files[0], {
      header: true,
      skipEmptyLines: true,
      complete: (r) => store.send({ type: 'setOrders', orders: r.data as any }),
      error: (e) => store.send({ type: 'setError', error: e.message })
    })
  }, [])

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { "text/csv": [".csv"] } })

  const download = async () => {
    setIsGenerating(true)
    const entries = Object.entries(grouped)
    
    if (entries.length === 1) {
      const [email, orders] = entries[0]
      const { html, attachments } = buildEmail(email, orders)
      const blob = new Blob([eml({
        from: "noreply@example.com",
        to: email,
        subject: "Valentine's Day Surprise!",
        html,
        attachments
      })], { type: "message/rfc822" })
      saveAs(blob, `${email.replace(/[^a-z0-9]/gi, '_')}.eml`)
    } else {
      const zip = new JSZip()
      for (const [email, orders] of entries) {
        const { html, attachments } = buildEmail(email, orders)
        zip.file(`${email.replace(/[^a-z0-9]/gi, '_')}.eml`, eml({
          from: "noreply@example.com",
          to: email,
          subject: "Valentine's Day Surprise!",
          html,
          attachments
        }))
      }
      const blob = await zip.generateAsync({ type: "blob" })
      saveAs(blob, "emails.zip")
    }
    setIsGenerating(false)
  }

  return (
    <div className="app-container">
      <mdui-top-app-bar variant="center-aligned">
        <mdui-top-app-bar-title>eBouqets</mdui-top-app-bar-title>
        <div style={{ flexGrow: 1 }}></div>
        {data.length > 0 && (
          <mdui-button variant="text" onClick={() => setResetDialogOpen(true)}>
            <mdui-icon name="delete_sweep"></mdui-icon>
          </mdui-button>
        )}
      </mdui-top-app-bar>

      <main className="main-content">
        {!data.length ? (
          <mdui-card variant="outlined" {...getRootProps()} className="upload-card">
            <input {...getInputProps()} />
            <mdui-icon name="upload_file" style={{ fontSize: '48px', marginBottom: '16px' }}></mdui-icon>
            <div style={{ fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>Drop CSV here or click to upload</div>
            <div style={{ fontSize: '14px', color: '#757575', marginBottom: '32px' }}>Required columns: flower type, message, to, name</div>
            <mdui-button variant="tonal" onClick={(e: any) => {
              e.stopPropagation();
              fetch('/data.csv').then(r => r.text()).then(csv => Papa.parse(csv, { header: true, skipEmptyLines: true, complete: (r) => store.send({ type: 'setOrders', orders: r.data as any }) }))
            }}>Load Sample Data</mdui-button>
          </mdui-card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="section-header">
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {Object.keys(grouped).length} Recipients
              </div>
              <mdui-button variant="filled" onClick={download} disabled={isGenerating || isProcessing}>
                <mdui-icon slot="icon" name="download"></mdui-icon>
                {isGenerating || isProcessing ? 'Processing...' : 'Download ZIP'}
              </mdui-button>
            </div>

            {(isGenerating || isProcessing) && (
              <mdui-linear-progress></mdui-linear-progress>
            )}

            {error && (
              <div className="error-banner">
                <mdui-icon name="error"></mdui-icon>
                <span>{error}</span>
              </div>
            )}

            <mdui-list className="recipient-list">
              {Object.entries(grouped).map(([email, orders]) => (
                <mdui-collapse key={email}>
                  <mdui-collapse-item>
                    <mdui-list-item slot="header">
                      <mdui-icon slot="icon" name="email"></mdui-icon>
                      {orders[0]?.name ? `${orders[0].name} (${email})` : email}
                      <div slot="description">{orders.length} Messages</div>
                    </mdui-list-item>
                    <div className="preview-container">
                      <div className="email-card">
                        <img src="https://9j5dvt8v5a4l4xi0.public.blob.vercel-storage.com/shares/ift1xb3j.png" className="email-header-img" />
                        <p style={{ marginBottom: '24px' }}>Dear {orders[0]?.name || email},</p>
                        <div style={{ fontStyle: 'italic', marginBottom: '24px', color: '#444' }}>
                          <p style={{ color: '#d32f2f', margin: 0 }}>Roses are red,</p>
                          <p style={{ color: '#1976d2', margin: 0 }}>Violets are blue,</p>
                          <p style={{ margin: 0 }}>Valentine's Day is near</p>
                          <p style={{ margin: 0 }}>So look forward to some messages to you &lt;3</p>
                        </div>
                        <div>
                          {orders.map((o, i) => (
                            <div key={i} className="email-order-unit">
                              {o.bouquetImage && (
                                <div className="email-bouquet-container">
                                  <img src={o.bouquetImage} style={{ maxWidth: '100%' }} />
                                </div>
                              )}
                              <div className="email-message">
                                <p>"{o.message}"</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </mdui-collapse-item>
                </mdui-collapse>
              ))}
            </mdui-list>
          </div>
        )}
      </main>

      <mdui-dialog 
        open={resetDialogOpen}
        headline="Reset Data?"
        description="This will clear all current orders and bouquets."
        onClosed={() => setResetDialogOpen(false)}
      >
        <mdui-button slot="action" variant="text" onClick={() => setResetDialogOpen(false)}>Cancel</mdui-button>
        <mdui-button slot="action" variant="filled" onClick={() => { store.send({ type: 'reset' }); setResetDialogOpen(false); }}>Reset</mdui-button>
      </mdui-dialog>
    </div>
  )
}
