"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface Heading {
  level: 1 | 2;
  text: string;
  line: number;
  children?: Heading[];
}

interface TableOfContentsProps {
  headings: Heading[];
  onHeadingClick: (line: number) => void;
  isDarkMode?: boolean;
}

const TableOfContents = ({ headings, onHeadingClick, isDarkMode = false }: TableOfContentsProps) => {
  const hasHeadings = headings.some(h => h.level === 1 || (h.children && h.children.length > 0));

  if (!hasHeadings) {
    return (
      <div className={`p-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        No H1 or H2 headings found.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full p-2">
      <div className="p-2">
        <h3 className={`mb-2 text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>Table of Contents</h3>
        <Accordion type="multiple" className="w-full">
          {headings.map((h1) => (
            <AccordionItem value={`item-${h1.line}`} key={h1.line}>
              <AccordionTrigger
                onClick={() => onHeadingClick(h1.line)}
                className={`flex justify-between items-center w-full text-left py-2 px-2 rounded hover:no-underline ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100'}`}
              >
                <span className="font-medium">{h1.text}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-1 pl-4">
                {h1.children && h1.children.length > 0 ? (
                  <ul className="space-y-1 mt-1">
                    {h1.children.map((h2) => (
                      <li key={h2.line}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start text-left h-auto py-1 px-2 font-normal ${isDarkMode ? 'text-gray-400 hover:bg-gray-600 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-200 hover:text-black'}`}
                          onClick={() => onHeadingClick(h2.line)}
                        >
                          {h2.text}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={`px-2 py-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No H2 headings under this section.</div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </ScrollArea>
  );
};

export default TableOfContents; 