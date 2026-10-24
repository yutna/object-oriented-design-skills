# Immutable values

A value that can change hides the change from every holder but one. Two
invoices share a fee, one invoice adds a line, and the other invoice's
total changes. An immutable value has no such path: every operation
returns a new value, and the old one stays as it was.

## A shared fee that changed two invoices

```text
class Fee
  - amount: Money
  + new(amount: Money)
  + add(other: Fee): void
    amount := amount.plus(other.amount())
    return
  + amount(): Money
    return amount

class Invoice
  - fee: Fee
  + new(fee: Fee)
  + addLine(line: Fee): void
    fee.add(line)
    return
```

`amount.plus(other.amount())` is taken to mean a new money amount that
is the sum of the two. When one `Fee` instance reaches two invoices, as
it does when a caller reads a fee once and passes it to both, `addLine`
on the first invoice changes the fee the second invoice still holds. The
second invoice's total changed, and no code asked it to.

## The immutable fee

```text
value Fee
  - amount: Money
  - currency: Currency
  + new(amount: Money, currency: Currency)
  + amount(): Money
    return amount
  + currency(): Currency
    return currency
  + plus(other: Fee): Fee
    raises CurrencyMismatch
    if currency = other.currency() then
      return new Fee(amount.plus(other.amount()), currency)
    else
      raise CurrencyMismatch

class Invoice
  - fee: Fee
  + new(fee: Fee)
  + addLine(line: Fee): void
    fee := fee.plus(line)
    return
```

`Fee` is a `value`, so it has no setter and no method that changes a
field. `plus` returns a new fee and changes no field of the fee it is
sent to. Two fees in one currency add; two fees in different currencies
raise `CurrencyMismatch`, which names the rule that was broken.
`currency = other.currency()` compares two `Currency` values by their
contents. `Invoice.addLine` replaces its own fee with the new one, so an
invoice that shares the old fee shows no change.

## Why an immutable value needs no copy

A value cannot change after it is built, so every holder sees the same
contents forever. Passing it in needs no copy, and handing it out needs
no copy, because no holder has a way to change it. A defensive copy
would be equal to the original and protect nothing. Copying a mutable
value is the other side of the same rule: copy what can change, and
share what cannot. An entity is different again: it changes, but it is
shared by identity, so it is neither copied nor replaced.
