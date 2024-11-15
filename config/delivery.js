const deliveryChargesByDistance = {
    local: 50,     
    regional: 100,  
    national: 150  
};

const storeLocation = {
    pincode: "673637"
};

// Function to calculate distance 
function calculateDistance(customerPincode) {
    if (!customerPincode) {
        return Infinity;
    }

    const storePincodeValue = parseInt(storeLocation.pincode, 10);
    const customerPincodeValue = parseInt(customerPincode, 10);
    
    const distance = Math.abs(storePincodeValue - customerPincodeValue); 
        return distance; 
}

// Function to determine delivery charge based on distance
function calculateDeliveryCharge(customerPincode) {
    const distance = calculateDistance(customerPincode);

    let charge;
    if (distance <= 10) {
        charge = deliveryChargesByDistance.local; 
    } else if (distance <= 50) {
        charge = deliveryChargesByDistance.regional; 
    } else {
        charge = deliveryChargesByDistance.national; 
    }


    return charge;
}

module.exports = {
    calculateDeliveryCharge,
    storeLocation
};
