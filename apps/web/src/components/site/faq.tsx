"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { Accordion } from "@/components/ui/accordion";

/** Springy FAQ accordion (FarsiUI Accordion root, Base UI panels animate --accordion-panel-height). */
export function Faq({ items }: { items: [string, string][] }) {
  return (
    <Accordion className="faq">
      {items.map(([q, a], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static content
        <AccordionPrimitive.Item key={i} className="q" data-reveal="">
          <AccordionPrimitive.Header render={<h3 className="m-0" />}>
            <AccordionPrimitive.Trigger className="q-trigger">
              <span>{q}</span>
              <span className="pl" aria-hidden="true" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Panel className="q-panel">
            <p>{a}</p>
          </AccordionPrimitive.Panel>
        </AccordionPrimitive.Item>
      ))}
    </Accordion>
  );
}
