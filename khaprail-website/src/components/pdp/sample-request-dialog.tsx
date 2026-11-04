import { useState, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { buildSampleRequestMessage, buildWhatsAppUrl } from "@/lib/whatsapp"

interface SampleRequestDialogProps {
  productId: string
  productName: string
  /** Trigger button text (default "Get a Sample"). */
  label?: string
}

// "Get a Sample" (05-PDP-SPEC.md): captures name/phone/message, logs to the
// `sample_inquiries` table, then opens the same WhatsApp deep-link pattern
// used elsewhere on the site (src/lib/whatsapp.ts).
export function SampleRequestDialog({ productId, productName, label = "Get a Sample" }: SampleRequestDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState(buildSampleRequestMessage(productName))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setLogError(null)

    if (supabase) {
      const { error } = await supabase
        .from("sample_inquiries")
        .insert({ product_id: productId, name, phone, message })
      if (error) setLogError(error.message)
    }

    window.open(buildWhatsAppUrl(`${message} (Name: ${name}, Phone: ${phone})`), "_blank", "noreferrer")
    setIsSubmitting(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="h-14 px-7 text-lg" />}>
        {label}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Request a Sample</DialogTitle>
            <DialogDescription>
              We'll follow up on WhatsApp to arrange your free {productName} sample.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sample-name" className="text-sm font-medium">
                Name
              </label>
              <Input id="sample-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sample-phone" className="text-sm font-medium">
                Phone
              </label>
              <Input
                id="sample-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sample-message" className="text-sm font-medium">
                Message
              </label>
              <Textarea id="sample-message" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            {logError && <p className="text-sm text-destructive">{logError}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Continue on WhatsApp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
