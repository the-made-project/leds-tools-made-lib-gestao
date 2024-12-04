# Made Metrics Report

A TypeScript library to generate agile metrics and reports in Markdown format, making it easy to visualize and analyze data from your agile process.

## 🚀 Features

### Markdown Reports
- **Sprint Reports**: Automatic generation of sprint reports including:
  - Completed stories
  - Sprint velocity
  - Burndown chart
  - Impediments and risks
  - Retrospective

- **Backlog Insights**: Clear visualization of your backlog with:
  - Stories distribution by epic
  - Estimates
  - Prioritization
  - Dependencies

- **Roadmap Visualization**: Visual mapping of your roadmap including:
  - Major milestones
  - Delivery dependencies
  - Estimated timeline
  - Strategic objectives

### Advanced Metrics

#### Throughput Analysis
- Automatic delivery rate calculation
- Trends over time
- Pattern and anomaly identification
- Historical data-based forecasts

#### Cumulative Flow Diagram
- Workflow visualization
- Bottleneck identification
- WIP (Work in Progress) analysis
- Cycle time and lead time

#### Monte Carlo Simulation
- Probabilistic delivery forecasts
- Risk analysis
- Confidence intervals for estimates

## 🛠 Installation

```bash
npm i made-report-lib

```

## 📖 How to Use

```typescript
import { ReportManager } from "made-report-lib"

const report = new ReportManager ()
const dbpath = "./example"
report.createReport(dbpath)

```
## Referencia
* [How to Create Your Own TypeScript Library in 2024: A Step-by-Step Guide](https://simonboisset.com/blog/create-typescript-library-tsup)





