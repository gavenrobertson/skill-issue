import { lazy, Suspense, useEffect } from 'react';
import { IdeFallback } from '../components/LessonPage.jsx';

const Ide = lazy(() => import('../components/Ide.jsx'));

const PLAYGROUND_TEMPLATE = `#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> langs{"C", "C++", "Rust"};
    for (const auto& lang : langs) {
        std::cout << "Hello, " << lang << "!\\n";
    }
}
`;

export default function Playground() {
  useEffect(() => {
    document.title = 'Playground · skill::issue';
  }, []);
  return (
    <div className="playground">
      <div className="playground-head">
        <h1>Playground</h1>
        <p className="muted">A free-form scratchpad. Your code is saved automatically in this browser. Put program input in the Input (stdin) tab.</p>
      </div>
      <div className="playground-ide">
        <Suspense fallback={<IdeFallback />}>
          <Ide tabs={[{ key: 'playground', label: 'Playground', template: PLAYGROUND_TEMPLATE }]} activeKey="playground" onSelect={() => {}} />
        </Suspense>
      </div>
    </div>
  );
}
