SET client_min_messages = warning;

-- Empties the throwaway demo database so each take starts as a brand-new account.
TRUNCATE bigshop_rate_limit, bigshop_user, bigshop_api_credential, bigshop_item_quote, bigshop_session, bigshop_plan, bigshop_transcript_credential, bigshop_recipe_ingredient, bigshop_recipe, bigshop_shop_item, bigshop_price_offer, bigshop_price_feed_lookup CASCADE;

-- The app only labels a price's source if the link is public https, and the film's tracker is a mock
-- on 127.0.0.1, so "Price from" would come out blank. This relabels those fixture links as they're
-- stored. It exists only in this database, and changes nothing about where the prices came from.
CREATE OR REPLACE FUNCTION film_fixture_source_url() RETURNS trigger AS $$
BEGIN
  NEW."sourceUrl" := replace(NEW."sourceUrl", 'http://127.0.0.1:4110', 'https://price-tracker.example');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS film_fixture_source_url ON bigshop_price_offer;
CREATE TRIGGER film_fixture_source_url BEFORE INSERT OR UPDATE ON bigshop_price_offer
  FOR EACH ROW EXECUTE FUNCTION film_fixture_source_url();
