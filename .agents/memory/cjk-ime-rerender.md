---
name: CJK IME broken by frequent re-renders
description: Why controlled form inputs become "untypeable" for Traditional/Simplified Chinese users when a parent re-renders every second.
---

A controlled react-hook-form input that renders fine and looks normal can still be
impossible to type into for CJK (zh-TW / zh-CN) users if an ancestor component
re-renders on a short interval (e.g. `setInterval(setNow, 1000)` for a countdown).

**Why:** every parent re-render resets the controlled input's value mid-IME
composition, cancelling the candidate buffer before the user can commit a character.
ASCII typing survives (value preserved), but CJK composition gets wiped each tick, so
the user reports "格子無法打" (can't type in the box). The timer often runs even when
the feature needing it (countdown) is disabled, so the symptom appears on plain forms.

**How to apply:** never let a per-second/high-frequency `setState` timer live in a
component that also renders text inputs. Isolate the ticking UI (countdown, clock) into
its own child component that owns its own state+interval, so the form never re-renders
on the clock. Compute visibility flags without the ticking value (e.g.
`target > Date.now()` at render time, child self-hides when expired).
