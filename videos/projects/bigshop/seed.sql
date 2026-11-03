-- Empties the throwaway demo database so each take starts as a brand-new account.
TRUNCATE bigshop_rate_limit, bigshop_user, bigshop_api_credential, bigshop_item_quote, bigshop_session, bigshop_plan, bigshop_transcript_credential, bigshop_recipe_ingredient, bigshop_recipe, bigshop_shop_item, bigshop_price_offer CASCADE;
