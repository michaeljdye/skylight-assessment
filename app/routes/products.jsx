import {Link, useLoaderData} from '@remix-run/react';
import {defer} from '@remix-run/server-runtime';
import {getPaginationVariables, Image, Money} from '@shopify/hydrogen';
import React from 'react';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {useVariantUrl} from '~/lib/variants';

/**
 * @param {LoaderFunctionArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return defer({...deferredData, ...criticalData});
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {LoaderFunctionArgs}
 */
async function loadCriticalData({context, params, request}) {
  const variables = getPaginationVariables(request, {
    pageBy: 8,
  });

  const {products} = await context.storefront.query(ALL_PRODUCTS_QUERY, {
    variables,
  });

  return products;
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {LoaderFunctionArgs}
 */
function loadDeferredData({context}) {
  return {};
}

export default function Products() {
  const products = useLoaderData();

  return (
    <PaginatedResourceSection
      connection={products}
      resourcesClassName="products-grid"
    >
      {({node: product, index}) => (
        <ProductItem
          key={product.id}
          product={product}
          loading={index < 8 ? 'eager' : undefined}
        />
      )}
    </PaginatedResourceSection>
  );
}

/**
 * @param {{
 *   product: ProductItemFragment;
 *   loading?: 'eager' | 'lazy';
 * }}
 */
function ProductItem({product, loading}) {
  const variant = product.variants.nodes[0];
  const variantUrl = useVariantUrl(product.handle, variant.selectedOptions);
  return (
    <Link
      className="product-item"
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      {product.featuredImage && (
        <Image
          alt={product.featuredImage.altText || product.title}
          aspectRatio="1/1"
          data={product.featuredImage}
          loading={loading}
          sizes="(min-width: 45em) 400px, 100vw"
        />
      )}
      <h4>{product.title}</h4>
      <small>
        <Money data={product.priceRange.minVariantPrice} />
      </small>
    </Link>
  );
}

const PRODUCT_CARD_FRAGMENT = `#graphql
 fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductCard on Product {
    id
    title
    publishedAt
    handle
    vendor
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    featuredImage {
      id
      altText
      url
      width
      height
    }
    variants(first: 1) {
      nodes {
        id
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
      }
    }
  }
`;

const ALL_PRODUCTS_QUERY = `#graphql
  query AllProducts(
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;
