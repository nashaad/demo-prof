---
doc_id: QC-004
title: Statistical Process Control and Sampling
domain: quality
criticality: standard
revision: B
effective_date: 2025-12-01
status: current
supersedes: null
---

# Statistical Process Control and Sampling

Calder Ridge Manufacturing, Plant 1

## 1. Purpose and scope

This standard sets how process stability is monitored and how often parts are sampled during production. It applies to all machined and pressed parts on Lines 1, 2 and 3 that carry a critical feature in QC-001.

## 2. Control charts

Critical features are charted with X-bar and R charts. Use a subgroup of 5 consecutive parts. Control limits are calculated from at least 25 subgroups collected after a stable setup. Operators plot each subgroup on the chart at the machine.

## 3. Process capability targets

| Feature class | Minimum Cpk | Review trigger |
|---|---|---|
| Critical features | 1.67 | Cpk below 1.67 for two consecutive months |
| Standard features | 1.33 | Cpk below 1.33 for two consecutive months |

Capability is reviewed monthly by the quality engineer.

## 4. Sampling frequency

| Line | Feature type | Frequency |
|---|---|---|
| Line 1 (CNC 1, CNC 2) | Critical bores | 1 subgroup every 50 parts |
| Line 2 (Press 3) | Critical dimensions | 1 subgroup every 200 parts |
| Line 3 (Press 4, CNC 3) | Critical bores and lengths | 1 subgroup every 50 parts |
| All lines | First-article | After every setup and tool change |

Sampling frequency doubles for 2 hours after a tool change or after a stop longer than 30 minutes.

## 5. Reaction rules

Take action when any of these occur:

1. A point is outside the control limits.
2. 7 consecutive points are on one side of the centre line.
3. 7 consecutive points trend up or down.
4. 2 of 3 consecutive points are in the outer third of the control band.

The operator stops the process, notifies the quality technician and checks the last 50 parts produced. If any part is outside tolerance, containment follows QC-002.

## 6. Records

Control charts are filed with the lot record and kept for 7 years. The quality engineer retains the monthly capability reports for 3 years.
