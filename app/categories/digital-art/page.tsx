import type { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/server';
import { generateSlug } from '@/src/utils/slugUtils';
import DigitalArtPageClient from './DigitalArtPageClient';

export const metadata: Metadata = {
  title: 'Digital Art Prints — Buy Online India | Lurevi',
  description:
    'Shop curated digital art prints in India. Contemporary illustrations, paintings and wall art — printed on archival paper, shipped across India. From ₹320.',
  alternates: {
    canonical: 'https://lurevi.in/categories/digital-art',
    languages: {
      'en-IN': 'https://lurevi.in/categories/digital-art',
      'x-default': 'https://lurevi.in/categories/digital-art',
    },
  },
  openGraph: {
    title: 'Digital Art Prints — Buy Online India | Lurevi',
    description:
      'Shop curated digital art prints in India. Contemporary illustrations, paintings and wall art — printed on archival paper, shipped across India. From ₹320.',
    url: 'https://lurevi.in/categories/digital-art',
    images: [{ url: 'https://lurevi.in/logo.png', width: 1200, height: 630, alt: 'Lurevi' }],
  },
};

export const revalidate = 3600;

export default async function Page() {
  const supabase = createStaticClient();

  // Fetch active digital products from the products catalog
  let products = [];
  try {
    const { data } = await supabase
      .from('products')
      .select('id, title, description, price, images, rating, featured, created_date, status, categories, tags, product_type')
      .eq('status', 'active')
      .eq('product_type', 'digital');
    
    products = data || [];
  } catch (err) {
    console.error('Error fetching digital products for collection:', err);
  }

  // Pick 5 random products
  const shuffled = [...products].sort(() => 0.5 - Math.random());
  const selectedProducts = shuffled.slice(0, 5);

  const schemas = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': 'https://lurevi.in/categories/digital-art/#webpage',
        url: 'https://lurevi.in/categories/digital-art',
        name: 'Digital Art Prints — Buy Online India | Lurevi',
        description: 'Shop curated digital art prints in India. Contemporary illustrations, paintings and wall art — printed on archival paper, shipped across India. From ₹320.',
        inLanguage: 'en-IN',
        isPartOf: { '@id': 'https://lurevi.in/#website' },
      },
      {
        '@type': 'ItemList',
        '@id': 'https://lurevi.in/categories/digital-art/#itemlist',
        name: 'Top Digital Art Prints',
        numberOfItems: selectedProducts.length,
        itemListElement: selectedProducts.map((p, idx) => {
          const firstImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : 'https://lurevi.in/logo.png';
          const categorySlug = Array.isArray(p.categories) && p.categories.length > 0 ? p.categories[0].toLowerCase() : 'digital-art';
          const productSlug = p.slug || generateSlug(p.title);
          
          return {
            '@type': 'ListItem',
            position: idx + 1,
            item: {
              '@type': 'Product',
              name: p.title,
              image: [firstImage],
              url: `https://lurevi.in/categories/${categorySlug}/${productSlug}`,
              offers: {
                '@type': 'Offer',
                price: p.price,
                priceCurrency: 'INR',
                availability: 'https://schema.org/InStock',
              },
            },
          };
        }),
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://lurevi.in/categories/digital-art/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is digital art?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Digital art is artwork created using digital technology, such as computers, tablets, and stylus pens, instead of traditional physical media like oil paints or watercolor.',
            },
          },
          {
            '@type': 'Question',
            name: 'How is a digital art print made?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'At Lurevi, digital art prints are created by taking the high-resolution digital-native file and printing it using premium pigment-based inks on museum-grade archival matte paper (200 GSM) or premium canvas (350 GSM).',
            },
          },
          {
            '@type': 'Question',
            name: 'Is digital art as good as original paintings for home decor?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! Digital art prints offer exceptional clarity, crisp lines, and uniform color accuracy. Because they are designed natively on screens, they translate to print with incredible fidelity, making them perfect for modern, clean decor.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I get digital art prints framed in India?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! Lurevi ships all prints in standard dimensions (like A4, A3, A2, A1), making it very easy to find pre-made frames at local shops or online. You can also take them to any local framing shop in India.',
            },
          },
          {
            '@type': 'Question',
            name: 'What digital art styles work best in Indian homes?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Indian home decors range from traditional to modern minimalist. Abstract prints and geometric landscape illustrations work beautifully in contemporary apartments, while colorful portraits and map prints add a personalized touch to family living rooms.',
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemas),
        }}
      />
      <DigitalArtPageClient initialProducts={selectedProducts} />
    </>
  );
}
