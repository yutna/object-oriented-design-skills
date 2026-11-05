# Async at the Edge

`VisitClaim` is a claim the clinic submits to a patient's insurer after
a visit. This file follows one use case through rules 7 and 8: the
claim as it stands, with the domain object awaiting the claim channel
inside its own method, and the same use case after the await moves into
an application service. The types share one file here to keep the
example short; in the code base each has its own.

## The domain that waits

```csharp
using System;
using System.Threading.Tasks;

public interface IClaimChannel
{
    Task<string> SendAsync(string claimNumber, string message);
}

public sealed class VisitClaim
{
    private readonly string claimNumber;
    private readonly string visitId;
    private readonly decimal amount;
    private string? receiptReference;

    public VisitClaim(string claimNumber, string visitId, decimal amount)
    {
        ArgumentNullException.ThrowIfNull(claimNumber);
        ArgumentNullException.ThrowIfNull(visitId);
        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(amount), "a claim is for a positive amount");
        }
        this.claimNumber = claimNumber;
        this.visitId = visitId;
        this.amount = amount;
        receiptReference = null;
    }

    public string ClaimNumber => claimNumber;

    public bool HasReceipt => receiptReference is not null;

    public string Message()
    {
        return $"visit {visitId} costs {amount:0.00}";
    }

    public async Task SendAsync(IClaimChannel channel)
    {
        ArgumentNullException.ThrowIfNull(channel);
        receiptReference = await channel.SendAsync(
            ClaimNumber, Message());
    }
}
```

In the first fence, `VisitClaim.SendAsync` awaits `IClaimChannel`
inside the domain object: the method is `async`, names the port, and
the claim cannot be tested without an insurer stand-in (rule 7). The
port also says nothing about the refusal an implementation raises, so
a caller cannot read which exception to expect (rule 8). The fence
sets the receipt reference on the `VisitClaim` it was given, whose
identity is `ClaimNumber`, shows no transaction, and leaves out where
the claim is stored.

## A worked change

1. Move the await into a new application service, `SubmitVisitClaim`,
   which receives `IClaimChannel` through its constructor and sends
   the claim.
2. Leave `VisitClaim` with a synchronous `Message` and a synchronous
   `RecordReceipt` that sets the reference the service got.
3. Add `ClaimRefused` and declare it in an
   `<exception cref="ClaimRefused">` tag on `IClaimChannel.SendAsync`;
   make `InsurerClaimChannel` catch the insurer's refusal,
   `InsurerRefusalException`, and throw `ClaimRefused`, letting any
   other gateway failure pass as a fault.

```csharp
using System;
using System.Threading.Tasks;

public sealed class ClaimRefused : Exception
{
    public ClaimRefused(string reason) : base(reason)
    {
    }
}

public interface IClaimChannel
{
    /// <summary>Sends one claim to the insurer.</summary>
    /// <exception cref="ClaimRefused">
    /// The insurer refused the claim; the caller may correct the claim
    /// and send it again.
    /// </exception>
    Task<string> SendAsync(string claimNumber, string message);
}

public sealed class VisitClaim
{
    private readonly string claimNumber;
    private readonly string visitId;
    private readonly decimal amount;
    private string? receiptReference;

    public VisitClaim(string claimNumber, string visitId, decimal amount)
    {
        ArgumentNullException.ThrowIfNull(claimNumber);
        ArgumentNullException.ThrowIfNull(visitId);
        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(amount), "a claim is for a positive amount");
        }
        this.claimNumber = claimNumber;
        this.visitId = visitId;
        this.amount = amount;
        receiptReference = null;
    }

    public string ClaimNumber => claimNumber;

    public bool HasReceipt => receiptReference is not null;

    public string Message()
    {
        return $"visit {visitId} costs {amount:0.00}";
    }

    public void RecordReceipt(string reference)
    {
        ArgumentNullException.ThrowIfNull(reference);
        receiptReference = reference;
    }
}

public sealed class SubmitVisitClaim
{
    private readonly IClaimChannel channel;

    public SubmitVisitClaim(IClaimChannel channel)
    {
        ArgumentNullException.ThrowIfNull(channel);
        this.channel = channel;
    }

    public async Task SubmitAsync(VisitClaim claim)
    {
        ArgumentNullException.ThrowIfNull(claim);
        var reference = await channel.SendAsync(
            claim.ClaimNumber, claim.Message());
        claim.RecordReceipt(reference);
    }
}

public sealed class InsurerGateway
{
    public Task<string> PostAsync(string claimNumber, string message)
    {
        return Task.FromResult($"receipt-{claimNumber}");
    }
}

public sealed class InsurerRefusalException : Exception
{
    public InsurerRefusalException(string message) : base(message)
    {
    }
}

public sealed class InsurerClaimChannel : IClaimChannel
{
    private readonly InsurerGateway gateway;

    public InsurerClaimChannel(InsurerGateway gateway)
    {
        ArgumentNullException.ThrowIfNull(gateway);
        this.gateway = gateway;
    }

    public async Task<string> SendAsync(
        string claimNumber, string message)
    {
        try
        {
            return await gateway.PostAsync(claimNumber, message);
        }
        catch (InsurerRefusalException refusal)
        {
            throw new ClaimRefused(refusal.Message);
        }
    }
}
```

In the After, `VisitClaim` has no `async` method and no port: `Message`
and `RecordReceipt` are synchronous, and the constructor only sets
fields and checks its arguments. `SubmitVisitClaim` is the application
service; it receives the port through its constructor, awaits it, and
then calls `claim.RecordReceipt` with the reference it got (rule 7).
`IClaimChannel` declares `ClaimRefused` in its `<exception>` tag, and
`InsurerClaimChannel` turns the insurer's refusal,
`InsurerRefusalException`, into that refusal and lets any other gateway
failure pass as a fault (rule 8). The fence sets the receipt reference
on the `VisitClaim` it was given, whose identity is `ClaimNumber`,
shows no transaction, and leaves out where the claim is stored. The
change ends with every domain method synchronous and no domain object
holding a port, so rule 7 is kept.
