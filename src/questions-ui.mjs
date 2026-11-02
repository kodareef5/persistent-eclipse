// Local dialogs only: no model calls, steering, cancellation, or goal changes.
import questions from './questions.cjs';

const text = value => String(value ?? '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
const preview = value => {
  const line = text(value).replace(/\s+/g, ' ').trim();
  return line.length > 90 ? line.slice(0, 87) + '…' : line;
};
export function questionDetail(q) {
  return [text(q.question), '',
    `From ${text(q.author || 'manager')}${q.task ? ` · ${text(q.task)}` : ''}`,
    q.affected && `Affected work: ${text(q.affected)}`,
    q.proposedDefault && `Suggested default (not approval): ${text(q.proposedDefault)}`,
    q.status === 'answered' && `Your answer: ${text(q.answer)}`,
  ].filter(line => line !== false && line != null).join('\n');
}

export async function questionInbox(lab, ui, refresh = () => {}) {
  let answered = false;
  while (true) {
    const all = questions.list(lab);
    if (!all.length) { ui.notify('No questions waiting for you.', 'info'); return; }
    const open = all.filter(q => q.status === 'open');
    const items = all.filter(q => (q.status === 'answered') === answered)
      .sort((a, b) => String(a.created).localeCompare(String(b.created)));
    const labels = items.map((q, i) => `${i + 1}. ${preview(q.question)}`);
    const toggle = answered ? `Open questions (${open.length})` : `Answered questions (${all.length - open.length})`;
    const selected = await ui.select(
      `${answered ? 'Answered questions' : `Questions for you · ${open.length} open`}\nResearch continues while you browse. Esc closes the inbox.`,
      [...labels, toggle, 'Close']);
    if (selected == null || selected === 'Close') return;
    if (selected === toggle) { answered = !answered; continue; }
    const q = items[labels.indexOf(selected)];
    if (!q) return;
    const action = await ui.select(questionDetail(q), [q.status === 'answered' ? 'Edit answer' : 'Answer', 'Back']);
    if (action == null || action === 'Back') continue;
    // Never turn a suggested default into an answer by prefilling it.
    const answer = await ui.editor(`Your answer\n${text(q.question)}\nSaved for the manager’s next turn; research keeps running.`, q.answer || '');
    if (answer == null) continue;
    if (!answer.trim()) { ui.notify('No answer saved. The question is unchanged.', 'info'); continue; }
    questions.answer(lab, q.id, answer);
    refresh();
    ui.notify('Answer saved for the manager’s next turn.', 'info');
  }
}
