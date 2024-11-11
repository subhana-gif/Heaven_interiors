// config/delivery.js
const deliveryChargesByDistance = {
    local: 50,      // Within 10 km
    regional: 100,  // Within 50 km
    national: 150   // Beyond 50 km
};

const storeLocation = {
    pincode: "673637" // Store's base pincode
};

// Function to calculate distance (simple estimation)
function calculateDistance(customerPincode) {
    if (!customerPincode) {
        return Infinity; // Return a high value for undefined inputs
    }

    // For simplicity, assume distance is based on numerical difference
    const storePincodeValue = parseInt(storeLocation.pincode, 10);
    const customerPincodeValue = parseInt(customerPincode, 10);
    
    const distance = Math.abs(storePincodeValue - customerPincodeValue); // This is a simplified estimation
        return distance; // Return the distance
}

// Function to determine delivery charge based on distance
function calculateDeliveryCharge(customerPincode) {
    const distance = calculateDistance(customerPincode);

    let charge;
    if (distance <= 10) {
        charge = deliveryChargesByDistance.local; // Within 10 km
    } else if (distance <= 50) {
        charge = deliveryChargesByDistance.regional; // Within 50 km
    } else {
        charge = deliveryChargesByDistance.national; // Beyond 50 km
    }


    return charge;
}

module.exports = {
    calculateDeliveryCharge,
    storeLocation
};
