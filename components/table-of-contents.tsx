"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

export interface Heading {
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
        <div className="space-y-2">
          {headings.map((h1) => (
            <div key={h1.line}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onHeadingClick(h1.line)}
                className={`w-full justify-start text-left h-auto py-1 px-2 rounded font-medium ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100'}`}
              >
                {h1.text}
              </Button>
              {h1.children && h1.children.length > 0 && (
                <ul className="space-y-1 mt-1 pl-4">
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
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

export default TableOfContents; 