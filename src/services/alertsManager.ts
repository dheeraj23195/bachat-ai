import { Transaction } from '../lib/types';
import { sendPushNotification, scheduleRecurringReminder } from './notifications';
import { useAlertsStore } from '../store/useAlertsStore';
import { listBudgets } from './budgets';
import { listTransactions } from './transactions';
import { listCategories } from './categories';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, addDays, subDays } from 'date-fns';

/**
 * Checks budgets based on recent transaction and fires alerts if thresholds crossed.
 */
export async function checkBudgetLimits(transaction: Transaction) {
  // Only expenses affect budgets
  if (transaction.type !== 'expense') return;

  const alertsState = useAlertsStore.getState();
  if (
    !alertsState.preferences.monthlyLimitAlert &&
    !alertsState.preferences.categoryLimitAlert
  ) {
    return;
  }

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  let txDate;
  try {
    txDate = parseISO(transaction.date);
  } catch {
    return;
  }

  // Only consider transactions in the current month
  if (!isWithinInterval(txDate, { start: monthStart, end: monthEnd })) return;

  try {
    const [activeBudgets, monthExpenses, categories] = await Promise.all([
      listBudgets({ activeOnly: true }),
      listTransactions({
        fromDate: monthStart.toISOString(),
        toDate: monthEnd.toISOString(),
        types: ['expense'],
      }),
      listCategories(),
    ]);

    const spendByCategory = new Map<string | null, number>();
    for (const t of monthExpenses) {
      const key = t.categoryId ?? null;
      spendByCategory.set(key, (spendByCategory.get(key) || 0) + t.amount);
    }

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    for (const budget of activeBudgets) {
      if (budget.limitAmount <= 0) continue;

      if (budget.categoryId === null && !alertsState.preferences.monthlyLimitAlert) continue;
      if (budget.categoryId !== null && !alertsState.preferences.categoryLimitAlert) continue;

      const spent = spendByCategory.get(budget.categoryId ?? null) || 0;
      const usagePercent = (spent / budget.limitAmount) * 100;

      if (usagePercent >= budget.alertThresholdPercent) {
        const isOver = usagePercent >= 100;
        const stateWord = isOver ? 'exceeded' : 'approached';
        const title = isOver ? 'Budget Exceeded!' : 'Approaching Budget Limit';
        const catName = budget.categoryId
          ? categoryMap.get(budget.categoryId) || 'Category'
          : 'Total Monthly';
        const body = `You have ${stateWord} your budget. Spent ₹${spent.toLocaleString()} out of ₹${budget.limitAmount.toLocaleString()} for ${catName} (${usagePercent.toFixed(0)}%).`;

        // Add to local store
        alertsState.addAlert({
          type: 'budget',
          title,
          body,
          relatedId: budget.id,
        });

        // Fire push notification (handles its own system sound)
        await sendPushNotification(title, body);
      }
    }
  } catch (err) {
    console.error('Failed to check budget limits', err);
  }
}

/**
 * Schedules a reminder for a recurring transaction.
 * Usually 1 day before the next occurrence.
 */
export async function scheduleTransactionReminders(transaction: Transaction) {
  if (!transaction.isRecurring || !transaction.recurringRule) return;

  try {
    const rule = JSON.parse(transaction.recurringRule);
    const txDate = parseISO(transaction.date);
    
    // We will calculate a naïve next occurrence if monthly
    // E.g., next month on the same day.
    const frequency = rule.frequency || 'monthly';
    const nextDate = new Date(txDate);

    if (frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (frequency === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    // Schedule 1 day before
    const reminderDate = subDays(nextDate, 1);
    
    // If it's in the past, don't schedule
    if (reminderDate <= new Date()) return;

    const title = 'Upcoming Recurring Expense';
    const body = `You have an upcoming expense of ₹${transaction.amount} scheduled for tomorrow!`;

    await scheduleRecurringReminder(title, body, reminderDate);

    // Note: We don't necessarily add this to useAlertsStore yet, because it hasn't fired.
  } catch (err) {
    console.error('Failed to schedule transaction reminder', err);
  }
}
