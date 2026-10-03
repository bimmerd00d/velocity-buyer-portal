/* Velocity Dealer Buyer Portal. Channel-scoped in BigCommerce Script Manager. */
(()=>{
if(document.querySelector('script[src^="https://microapps.bigcommerce.com/b2b-buyer-portal/index."]')||document.getElementById('velocity-buyer-portal'))return;
window.b3CheckoutConfig={routes:{dashboard:'/account.php?action=order_status'}};
window.B3={setting:{store_hash:"kl9eidhjei",channel_id:1,platform:'bigcommerce',environment:'production'},'dom.checkoutRegisterParentElement':'#checkout-app','dom.registerElement':'[href^="/login.php"], [href^="/account.php"], #checkout-customer-login, #checkout-customer-returning .form-legend-container [href="#"]','dom.openB3Checkout':'checkout-customer-continue',before_login_goto_page:'/account.php?action=order_status',checkout_super_clear_session:'true','dom.navUserLoginElement':'.account, .navUser-item.navUser-item--account'};
const script=document.createElement('script');script.id='velocity-buyer-portal';script.type='module';script.crossOrigin='anonymous';script.integrity="sha384-6IvkQzguOsuEIILP1Zoh9qglXAGhEhPTzPXZKTmnrK77HKYsac7eoJ1O54Lhy4Ei";script.src="https://velocity-buyer-portal.vercel.app/index.js";document.body.append(script);
})();
