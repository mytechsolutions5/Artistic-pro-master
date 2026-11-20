import type { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/server';
import HomepageClient from '@/src/page-components/Homepage';
import { generateSlug } from '@/src/utils/slugUtils';

export const metadata: Metadata = {
  title: 'Lurevi | Luxury That Stays With You',
  description:
    'Discover curated digital art, wall prints, and premium collections at Lurevi. Shop unique artwork that transforms your space.',
  alternates: { canonical: 'https://lurevi.in/' },
};

// Revalidate every hour so new categories/products appear quickly
export const revalidate = 3600;

export default async function HomePage() {
  const supabase = createStaticClient();

  // Fetch categories server-side so Google can index them directly in HTML
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  // Fetch featured products server-side for SEO visibility
  const { data: featuredProducts } = await supabase
    .from('products')
    .select('id, title, description, price, images, categories')
    .eq('status', 'active')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(12);

  // Fetch initial products for the homepage (Best Sellers, Featured Artwork)
  const { data: initialProducts } = await supabase
    .from('products')
    .select('id, title, price, original_price, discount_percentage, images, main_image, categories, category, rating, downloads, status, featured, product_type, created_date')
    .eq('status', 'active')
    .order('created_date', { ascending: false })
    .limit(36);

  // Fetch homepage settings
  let settings = null;
  try {
    const { data } = await supabase
      .from('homepage_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    settings = data;
  } catch (err) {
    console.error('Error fetching homepage settings on server:', err);
  }

  const hasSeoSections =
    Boolean(categories && categories.length > 0) ||
    Boolean(featuredProducts && featuredProducts.length > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://lurevi.in/#organization',
                name: 'Lurevi',
                url: 'https://lurevi.in/',
                logo: 'https://lurevi.in/logo.png',
                description: 'Luxury digital art, wall prints, and premium collections.',
              },
              {
                '@type': 'WebSite',
                '@id': 'https://lurevi.in/#website',
                url: 'https://lurevi.in/',
                name: 'Lurevi',
                publisher: {
                  '@id': 'https://lurevi.in/#organization'
                }
              },
              {
                '@type': 'FAQPage',
                '@id': 'https://lurevi.in/#faq',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: 'How do I receive my digital files after purchase?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Immediately upon checkout, you will receive an email with direct download links for your files. Alternatively, you can log into your Lurevi profile dashboard and access them from the \'Downloads\' tab at any time.'
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'What dimensions are Lurevi\'s digital prints suitable for?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Our files are exported as ultra-high-resolution 300 DPI files in standard print ratios (e.g. ISO A1-A4, 2:3 ratio, 3:4 ratio, 4:5 ratio). This allows you to print files at sizes ranging from 4x6 inches up to massive poster sizes like 24x36 inches without pixelation.'
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'Do Lurevi downloads include a commercial license?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'No, all digital files purchased on Lurevi are for personal use only. If you wish to use our designs for commercial decoration, product packaging, or advertising, please reach out to our support team for a commercial license.'
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'Do you ship physical prints and frames?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes! While we default to digital art downloads, you can select \'Physical Poster\' on the product page. We will print the artwork on museum-grade 200 GSM matte paper and deliver it directly to your address in protective tubes. Note that frames are not included.'
                    }
                  }
                ]
              }
            ]
          })
        }}
      />
      {/* Crawlable server-rendered homepage content for search engine indexers */}
      {hasSeoSections && (
        <div className="sr-only" aria-hidden="false">
          <h1>Lurevi — Premium Digital Art Prints &amp; Luxury Collections</h1>
          {categories && categories.length > 0 && (
            <section>
              <h2>Popular Categories</h2>
              <ul>
                {categories.slice(0, 10).map((cat) => (
                  <li key={cat.id}>
                    <a href={`/categories/${cat.slug}`}>
                      {cat.name}
                    </a>
                    {cat.description ? ` - ${cat.description}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {featuredProducts && featuredProducts.length > 0 && (
            <section>
              <h2>Featured Artworks</h2>
              <ul>
                {featuredProducts.slice(0, 10).map((p) => {
                  const categorySlug = Array.isArray(p.categories) && p.categories.length > 0 ? generateSlug(p.categories[0]) : 'browse';
                  return (
                    <li key={p.id}>
                      <a href={`/categories/${categorySlug}/${p.slug || generateSlug(p.title)}`}>
                        {p.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Client-side React app — full interactive experience */}
      <HomepageClient 
        initialCategories={categories || []}
        initialSettings={settings}
        initialProducts={initialProducts || []}
      />
    </>
  );
}

