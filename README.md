# faultline

A TypeScript CLI that maps fragile areas in a Git repository.

Faultline combines Git history with static dependency pressure and produces a visual **tectonic map** of the codebase. Files with repeated bugfix involvement, high change frequency, strong co-change coupling, many dependencies and repeated merge pressure rise toward the top of the risk map.

## Signals

Faultline combines five signals:

- **change frequency** — files that change often
- **bugfix involvement** — files repeatedly touched by commits containing `fix`, `bug`, `hotfix`, `regression`, `repair`, `defect`, or `patch`
- **dependency pressure** — incoming + outgoing local JS/TS imports
- **co-change coupling** — files that repeatedly change in the same commits
- **merge pressure** — files repeatedly touched in merge commits

## Risk score

```text
change frequency       25%
bugfix involvement     25%
dependency pressure    20%
co-change coupling     20%
merge pressure         10%
```

Risk levels:

```text
0-27    low
28-51   medium
52-71   high
72-100  critical
```

The score is deliberately heuristic. A high score does not mean bad code; it means the file deserves attention before a risky refactor or major change.

## Visual report

The standalone HTML report includes:

- one node per file
- node size based on risk
- risk color
- dependency edges
- co-change edges
- folder-based clustering
- search
- risk filtering
- per-file explanations
- hottest fault lines list

No server is needed to view the report.

## Quick start

```bash
npm install
npm run build
node dist/cli.js scan .
```

Then open:

```text
faultline-report/index.html
```

## Install as CLI

```bash
npm link
faultline scan .
```

## Options

```text
--max-commits <n>   Git commits to inspect (default 500)
--out <dir>         Output directory
--json-only         Generate JSON only
--html-only         Generate HTML only
```

Examples:

```bash
faultline scan ../my-api --max-commits 1500
faultline scan . --out reports/faultline
```

## Output

Faultline normally creates:

```text
faultline-report/
├── index.html
└── faultline.json
```

The JSON output makes it easy to integrate the analysis into CI, scripts or other tools.

## Dependency analysis

Faultline recognizes common local JS/TS import forms:

```ts
import { value } from "./module.js";
import "./side-effect.js";
export { value } from "./module.js";
const x = require("./module");
const y = import("./module.js");
```

Third-party package imports are intentionally ignored because the map focuses on internal repository structure.

## Architecture

```text
Git repository
     │
     ├── git log
     │    ├── change frequency
     │    ├── bugfix history
     │    ├── merge pressure
     │    └── co-change coupling
     │
     └── source tree
          └── local imports
                 │
                 ▼
            dependency graph
                 │
                 ▼
             risk scoring
                 │
           ┌─────┴─────┐
           ▼           ▼
         JSON        HTML map
```

## Project structure

```text
faultline/
├── src/
│   ├── core/
│   │   ├── analyzer.ts
│   │   ├── dependencies.ts
│   │   ├── git.ts
│   │   └── types.ts
│   ├── report/
│   │   └── html.ts
│   └── cli.ts
├── tests/
│   ├── analyzer.test.ts
│   ├── dependencies.test.ts
│   └── git.test.ts
├── examples/
│   └── demo-history.txt
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

- Node.js 20+
- Git
- npm

## Limitations

Merge touches are a proxy for conflict pressure, not direct parsing of every historic conflict resolution. Likewise, co-change does not always imply architectural coupling. Faultline is best used as an exploratory map for deciding where to add tests, inspect coupling or be extra careful during refactoring.

## Future directions

- actual conflict-resolution mining
- churn by lines changed
- branch-to-branch risk comparison
- Python import support
- CI thresholds
- SARIF export
- historical risk snapshots

## License

MIT
