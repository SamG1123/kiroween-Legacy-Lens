import { useState, useEffect } from 'react';
import { HelpCircle, Book, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function HelpDialog() {
  const [open, setOpen] = useState(false);

  // Keyboard shortcut: ? to open help
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Don't trigger if user is typing in an input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          aria-label="Open help and documentation"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
            Help & Documentation
          </DialogTitle>
          <DialogDescription>
            Learn how to use Legacy Code Revival AI to analyze and improve your codebase
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Start Guide</CardTitle>
                <CardDescription>Get up and running in minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Upload Your Codebase</h4>
                  <p className="text-sm text-gray-600">
                    Click the "New Analysis" button and choose your source:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 ml-4 mt-1 space-y-1">
                    <li><strong>GitHub URL:</strong> Paste a public repository URL</li>
                    <li><strong>ZIP File:</strong> Upload a compressed codebase (max 100MB)</li>
                    <li><strong>Local Directory:</strong> Select a folder from your computer</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2. Monitor Progress</h4>
                  <p className="text-sm text-gray-600">
                    Watch real-time progress as the system analyzes your code. The analysis includes:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 ml-4 mt-1 space-y-1">
                    <li>Language detection</li>
                    <li>Dependency analysis</li>
                    <li>Code metrics calculation</li>
                    <li>Issue detection</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">3. Review Results</h4>
                  <p className="text-sm text-gray-600">
                    Once complete, explore detailed insights across multiple tabs:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 ml-4 mt-1 space-y-1">
                    <li><strong>Overview:</strong> High-level summary and key metrics</li>
                    <li><strong>Languages:</strong> Language distribution and statistics</li>
                    <li><strong>Dependencies:</strong> External libraries and frameworks</li>
                    <li><strong>Metrics:</strong> Code quality and complexity metrics</li>
                    <li><strong>Issues:</strong> Detected code smells and problems</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">4. Download Reports</h4>
                  <p className="text-sm text-gray-600">
                    Export your analysis in multiple formats (JSON, PDF, Markdown) to share with your team.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1">What file size limits apply?</h4>
                  <p className="text-sm text-gray-600">
                    ZIP file uploads are limited to 100MB. For larger codebases, consider using GitHub URL or local directory options.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">How long does analysis take?</h4>
                  <p className="text-sm text-gray-600">
                    Analysis time varies based on codebase size and complexity. Small projects (under 10k LOC) typically complete in 1-2 minutes, while larger projects may take 5-10 minutes.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Which programming languages are supported?</h4>
                  <p className="text-sm text-gray-600">
                    The system supports 50+ programming languages including JavaScript, TypeScript, Python, Java, C#, Go, Ruby, PHP, and more.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Can I analyze private repositories?</h4>
                  <p className="text-sm text-gray-600">
                    Currently, only public GitHub repositories are supported via URL. For private code, use the ZIP file or local directory upload options.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">What is the Maintainability Index?</h4>
                  <p className="text-sm text-gray-600">
                    The Maintainability Index is a score from 0-100 that indicates how easy your code is to maintain. Higher scores (65+) indicate good maintainability, while lower scores suggest the code may be difficult to maintain.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">How are code smells detected?</h4>
                  <p className="text-sm text-gray-600">
                    The system uses static analysis and AI-powered detection to identify common code smells like long methods, duplicate code, complex conditionals, and more.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Can I delete old projects?</h4>
                  <p className="text-sm text-gray-600">
                    Yes, each project card has a delete button. Click it and confirm to permanently remove the project and all associated data.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">What happens if analysis fails?</h4>
                  <p className="text-sm text-gray-600">
                    If analysis fails, you'll see an error message with details. Common causes include invalid URLs, corrupted files, or unsupported file formats. You can retry the analysis after addressing the issue.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Resources</CardTitle>
                <CardDescription>Learn more about code quality and best practices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="https://github.com/your-org/legacy-code-revival"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <Book className="h-5 w-5 text-primary" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Full Documentation</div>
                    <div className="text-xs text-gray-600">Complete guide and API reference</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </a>

                <a
                  href="https://github.com/your-org/legacy-code-revival/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Report an Issue</div>
                    <div className="text-xs text-gray-600">Found a bug? Let us know</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </a>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2 text-sm">Keyboard Shortcuts</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Open help</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">?</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">New analysis</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">N</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Search projects</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">/</kbd>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
