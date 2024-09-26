import React from 'react';

const AddToCartBtn = ({onClick, disabled, fetcher, children}) => {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled ?? fetcher.state !== 'idle'}
      className="cart-btn"
    >
      {children}
    </button>
  );
};

export default AddToCartBtn;
