Phase 1: Local Foundation
1. localStorage/IndexedDB persistence
Start here because everything else depends on having historical data. IndexedDB is probably the move since you'll be storing structured keystroke events that could get large.
Store: bigram stats, raw keystroke events (with timestamps), session summaries (WPM, accuracy, duration), cycle history
This gets you immediate value and lets you start accumulating the data you'll need for the ML features later.
2. Focused drills
Low-hanging fruit once you have persistence. Just add a mode selector that filters your word generation to specific character sets (punctuation, numbers, specific bigram categories). Good UX win and gives you more control over what data you're collecting.

Phase 2: Backend + Analytics
3. Backend + Auth (FastAPI + Supabase)
Once localStorage is feeling limiting, migrate to a real backend. You know this stack well so it should be quick.
Schema design matters here—think about how you'll query for the analytics pipeline. Probably want tables for: users, sessions, keystroke_events (this gets big), bigram_stats (aggregated), and maybe a daily_summaries materialized view.
4. Analytics pipeline
This is where it gets interesting infra-wise. Options:

Simple path: PostgreSQL with good indexes, pg_cron for aggregation jobs, maybe TimescaleDB extension if you want time-series optimizations
Learning path: Set up a small ClickHouse instance, build an ETL that moves raw events from Postgres → ClickHouse for analytical queries. Overkill for your data volume but you'd learn a lot about OLAP vs OLTP separation

Build a simple dashboard (could just be a React page with Recharts) showing WPM over time, accuracy trends, bigram improvement curves.

Phase 3: ML Features
5. Fatigue detection
Good starter ML task because it's relatively simple and immediately useful.
Approach: sliding window over your session's keystroke events. Features like rolling average WPM (last 30s vs session average), error rate trend, inter-keystroke interval variance. Even a simple threshold-based heuristic works ("if WPM drops 15% from your first 2 minutes, suggest a break"), or you could train a small classifier on labeled "tired" vs "fresh" sessions.
6. Error prediction
This is the meatier ML problem. A few approaches:

Context-based features: what bigram, what preceded it (last word's ending, last few characters), position in word, time since session start, current rolling accuracy
Model options: start with logistic regression or a small gradient boosted model (XGBoost/LightGBM) just to see if there's signal. If you want to go deeper, a small LSTM/transformer on character sequences could capture more complex patterns
Training data: you'll need a decent amount of typing history. Maybe a few weeks of regular use, or build a "data collection mode" where you intentionally type a lot of varied text

The insight generation ("you mess up X after Y") could come from feature importance analysis or just mining association rules from your error patterns.

Phase 4: Social/Fun
7. Ghost racing
Save a "replay" of each session (timestamps + characters typed). Ghost mode plays back a previous session's keystrokes in real-time while you type. Could race yourself or (if you add user accounts) race others' public replays.
Implementation: store the keystroke stream with relative timestamps, render a second "cursor" that advances based on elapsed time since race start.

Summary Order

IndexedDB persistence (~1-2 days)
Focused drills (~half day)
Backend + Auth (~2-3 days, you know the stack)
Analytics pipeline (~1 week if learning ClickHouse, less if just Postgres)
Fatigue detection (~2-3 days for heuristic, longer for trained model)
Error prediction (~1-2 weeks depending on depth)
Ghost racing (~2-3 days)