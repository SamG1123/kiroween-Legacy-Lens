# Custom Domain Configuration Guide

This guide walks you through setting up a custom domain for your deployed application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Domain Registrars](#domain-registrars)
- [Vercel Setup](#vercel-setup)
- [Netlify Setup](#netlify-setup)
- [DNS Configuration](#dns-configuration)
- [SSL/HTTPS](#sslhttps)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- A registered domain name
- Access to your domain's DNS settings
- Deployed application on Vercel or Netlify

## Domain Registrars

Popular domain registrars:

- [Namecheap](https://www.namecheap.com)
- [GoDaddy](https://www.godaddy.com)
- [Google Domains](https://domains.google)
- [Cloudflare](https://www.cloudflare.com/products/registrar/)
- [Name.com](https://www.name.com)

## Vercel Setup

### Step 1: Add Domain in Vercel

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on "Settings" tab
3. Click on "Domains" in the sidebar
4. Enter your domain name (e.g., `example.com`)
5. Click "Add"

### Step 2: Configure DNS

Vercel will show you the DNS records to add. You have two options:

#### Option A: Using Vercel Nameservers (Recommended)

1. Vercel will provide nameservers like:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

2. Go to your domain registrar
3. Find DNS/Nameserver settings
4. Replace existing nameservers with Vercel's nameservers
5. Save changes

**Pros**: Automatic SSL, faster propagation, managed by Vercel
**Cons**: All DNS management moves to Vercel

#### Option B: Using A Records

1. Vercel will provide an IP address like:
   ```
   76.76.21.21
   ```

2. Add these DNS records at your registrar:

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | @ | 76.76.21.21 | 3600 |
   | CNAME | www | cname.vercel-dns.com | 3600 |

**Pros**: Keep existing DNS provider
**Cons**: Manual SSL setup, slower propagation

### Step 3: Add www Subdomain (Optional)

1. In Vercel, add `www.example.com` as another domain
2. Vercel will automatically redirect www to non-www (or vice versa)

### Step 4: Verify

1. Wait for DNS propagation (5 minutes to 48 hours)
2. Check status in Vercel dashboard
3. Visit your domain to verify

## Netlify Setup

### Step 1: Add Domain in Netlify

1. Go to your site in [Netlify Dashboard](https://app.netlify.com)
2. Click on "Domain settings"
3. Click "Add custom domain"
4. Enter your domain name (e.g., `example.com`)
5. Click "Verify"

### Step 2: Configure DNS

#### Option A: Using Netlify DNS (Recommended)

1. Click "Set up Netlify DNS"
2. Netlify will provide nameservers like:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```

3. Go to your domain registrar
4. Update nameservers to Netlify's nameservers
5. Click "Verify" in Netlify

**Pros**: Automatic SSL, managed DNS, faster deployments
**Cons**: All DNS management moves to Netlify

#### Option B: Using External DNS

1. Add these DNS records at your registrar:

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | @ | 75.2.60.5 | 3600 |
   | CNAME | www | [your-site].netlify.app | 3600 |

2. Or use ALIAS/ANAME record (if supported):

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | ALIAS | @ | [your-site].netlify.app | 3600 |
   | CNAME | www | [your-site].netlify.app | 3600 |

### Step 3: Enable HTTPS

1. In Netlify, go to "Domain settings"
2. Scroll to "HTTPS"
3. Click "Verify DNS configuration"
4. Click "Provision certificate"
5. Wait for SSL certificate to be issued (usually < 1 minute)

### Step 4: Verify

1. Wait for DNS propagation
2. Check status in Netlify dashboard
3. Visit your domain to verify

## DNS Configuration

### Common DNS Record Types

| Type | Purpose | Example |
|------|---------|---------|
| A | Points domain to IPv4 address | `example.com` → `76.76.21.21` |
| AAAA | Points domain to IPv6 address | `example.com` → `2606:4700::1` |
| CNAME | Points subdomain to another domain | `www` → `example.com` |
| ALIAS/ANAME | Like CNAME but for root domain | `@` → `example.netlify.app` |
| TXT | Text records for verification | SPF, DKIM, etc. |

### DNS Propagation

DNS changes can take time to propagate:

- **Minimum**: 5 minutes
- **Average**: 1-4 hours
- **Maximum**: 48 hours

Check propagation status:
- [whatsmydns.net](https://www.whatsmydns.net)
- [dnschecker.org](https://dnschecker.org)

### TTL (Time To Live)

- **Low TTL (300-600)**: Faster updates, more DNS queries
- **High TTL (3600-86400)**: Slower updates, fewer DNS queries
- **Recommendation**: Use 3600 (1 hour) for production

## SSL/HTTPS

### Automatic SSL

Both Vercel and Netlify provide automatic SSL certificates via Let's Encrypt:

- **Vercel**: Automatic, no configuration needed
- **Netlify**: Automatic after DNS verification

### Force HTTPS

Ensure all traffic uses HTTPS:

**Vercel**: Automatic redirect

**Netlify**: 
1. Go to "Domain settings"
2. Enable "Force HTTPS"

### SSL Certificate Renewal

- Certificates auto-renew before expiration
- No manual intervention needed
- Vercel/Netlify handle renewal automatically

## Troubleshooting

### Domain Not Working

1. **Check DNS propagation**:
   ```bash
   nslookup example.com
   dig example.com
   ```

2. **Verify DNS records**:
   - Use [whatsmydns.net](https://www.whatsmydns.net)
   - Check if records point to correct values

3. **Clear DNS cache**:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # macOS
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

### SSL Certificate Issues

1. **Certificate not provisioning**:
   - Verify DNS records are correct
   - Wait for DNS propagation
   - Check CAA records (should allow Let's Encrypt)

2. **Mixed content warnings**:
   - Ensure all resources load via HTTPS
   - Update API URLs to use HTTPS
   - Check for hardcoded HTTP URLs

### www vs non-www

**Best practice**: Choose one and redirect the other

**Vercel**: Automatic redirect configuration

**Netlify**: 
1. Add both domains
2. Set primary domain
3. Netlify redirects automatically

### Email Not Working

If you use email with your domain:

1. **Don't use Vercel/Netlify nameservers** if you need custom MX records
2. **Use external DNS** and add A/CNAME records manually
3. **Or migrate email** to a service that works with Vercel/Netlify DNS

### Subdomain Configuration

To add subdomains (e.g., `app.example.com`):

1. Add subdomain in Vercel/Netlify
2. Add CNAME record:
   ```
   app.example.com → [your-site].vercel.app
   ```

## Advanced Configuration

### Apex Domain with CNAME

Some DNS providers support CNAME flattening:

- Cloudflare (CNAME flattening)
- DNSimple (ALIAS records)
- DNS Made Easy (ANAME records)

### Multiple Domains

Point multiple domains to same site:

1. Add each domain in Vercel/Netlify
2. Configure DNS for each domain
3. Set primary domain
4. Others redirect automatically

### Wildcard Subdomains

**Vercel**: Not supported on Hobby plan

**Netlify**: 
1. Add wildcard domain: `*.example.com`
2. Add DNS record: `* CNAME [your-site].netlify.app`

## Verification Commands

### Check DNS Records

```bash
# A record
dig example.com A

# CNAME record
dig www.example.com CNAME

# All records
dig example.com ANY

# Use specific DNS server
dig @8.8.8.8 example.com
```

### Check SSL Certificate

```bash
# View certificate details
openssl s_client -connect example.com:443 -servername example.com

# Check certificate expiration
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Test HTTPS

```bash
# Check if HTTPS works
curl -I https://example.com

# Check if HTTP redirects to HTTPS
curl -I http://example.com
```

## Best Practices

1. **Use HTTPS**: Always force HTTPS
2. **Enable HSTS**: Strict-Transport-Security header
3. **Set up redirects**: www → non-www (or vice versa)
4. **Monitor uptime**: Use uptime monitoring service
5. **Backup DNS**: Keep DNS records documented
6. **Use CDN**: Vercel/Netlify provide global CDN
7. **Set reasonable TTL**: 3600 seconds (1 hour)

## Resources

- [Vercel Custom Domains](https://vercel.com/docs/concepts/projects/custom-domains)
- [Netlify Custom Domains](https://docs.netlify.com/domains-https/custom-domains/)
- [Let's Encrypt](https://letsencrypt.org/)
- [DNS Checker](https://dnschecker.org)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
